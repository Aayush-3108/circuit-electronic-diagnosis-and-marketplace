"""
Isolation Forest Fraud & Anomaly Detection Service for ReCircuit.

This service evaluates:
1. Device and component listing anomalies (implausible pricing, duplicate spam, rapid submissions).
2. Account & authentication security anomalies (brute force, repeated failures).
3. Component matching abuse (query hammering, bot scraping).
4. Provides calibrated risk scoring, explainable indicator breakdowns, and an admin review workflow.
"""

import math
import re
import uuid
from collections import defaultdict
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import joblib
import numpy as np
import pandas as pd

from app.config import settings
from app import sqlite_store
from app.schemas import ListingCreateRequest

MODELS_DIR = Path(__file__).resolve().parents[1] / "models"

# Reference price baselines (in INR)
DEVICE_REFERENCE_PRICES = {
    "phone": 25000.0,
    "laptop": 48000.0,
    "tablet": 22000.0,
    "pc": 42000.0,
    "monitor": 14000.0,
}

PART_REFERENCE_PRICES = {
    "screen": 4500.0,
    "battery": 2200.0,
    "motherboard": 9500.0,
    "camera": 2000.0,
    "keyboard": 1800.0,
    "chassis": 2400.0,
    "charging_port": 1200.0,
    "speaker": 900.0,
    "ram": 3000.0,
    "storage": 3500.0,
    "gpu": 16000.0,
    "cpu": 11000.0,
    "trackpad": 1500.0,
    "fans": 1000.0,
    "power_adapter": 1600.0,
    "other": 1500.0,
}

BRAND_MULTIPLIERS = {
    "budget": 0.65,
    "mid": 1.0,
    "premium": 1.85,
}

CONDITION_MULTIPLIERS = {
    "excellent": 1.0,
    "good": 0.85,
    "fair": 0.65,
    "damaged": 0.40,
    "for_parts": 0.20,
}

SUSPICIOUS_KEYWORDS = [
    "wire transfer", "western union", "moneygram", "gift card", "giftcard",
    "telegram", "whatsapp me at", "cashapp", "escrow outside", "pay outside",
    "crypto only", "bitcoin only", "urgent sell fast 100% genuine guaranteed",
]


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _infer_brand_tier(brand: str) -> str:
    b = (brand or "").lower().strip()
    if any(k in b for k in ["apple", "iphone", "macbook", "sony", "bose", "alienware", "razer"]):
        return "premium"
    elif any(k in b for k in ["realme", "redmi", "xiaomi", "poco", "infinix", "boat", "noise"]):
        return "budget"
    return "mid"


def _text_similarity(a: str, b: str) -> float:
    """Computes Jaccard word-token similarity between two text strings."""
    tokens_a = set(re.findall(r"\w+", (a or "").lower()))
    tokens_b = set(re.findall(r"\w+", (b or "").lower()))
    if not tokens_a or not tokens_b:
        return 0.0
    intersection = tokens_a.intersection(tokens_b)
    union = tokens_a.union(tokens_b)
    return len(intersection) / len(union)


class FraudDetectionService:
    def __init__(self):
        self.model = None
        self.schema = None
        self._load_attempted = False
        # In-memory sliding window for match queries: {user_id: [datetime, ...]}
        self._match_queries = defaultdict(list)
        self._match_criteria_history = defaultdict(list)

    def _load_model(self):
        if self._load_attempted:
            return self.model
        self._load_attempted = True

        model_path = Path(settings.fraud_model_path)
        schema_path = Path(settings.fraud_feature_schema_path)

        # Resolve relative to models dir if needed
        if not model_path.is_absolute():
            model_path = MODELS_DIR / model_path.name
        if not schema_path.is_absolute():
            schema_path = MODELS_DIR / schema_path.name

        try:
            if model_path.exists() and schema_path.exists():
                self.model = joblib.load(model_path)
                self.schema = joblib.load(schema_path)
                print(f"[fraud_service] Loaded Isolation Forest model v{self.schema.get('version')} from {model_path}")
            else:
                print(f"[fraud_service] Model files not found at {model_path}. Running with deterministic heuristic engine.")
        except Exception as e:
            print(f"[fraud_service] Failed to load Isolation Forest model: {e}. Falling back to heuristics.")
            self.model = None
            self.schema = None

        return self.model

    def get_health_status(self) -> dict:
        self._load_model()
        is_loaded = self.model is not None
        return {
            "status": "healthy",
            "model_loaded": is_loaded,
            "model_version": self.schema.get("version", "heuristic_rule_engine") if self.schema else "heuristic_rule_engine",
            "model_type": "IsolationForest (scikit-learn)" if is_loaded else "Heuristic Rule Fallback",
            "contamination": self.schema.get("contamination", settings.fraud_contamination) if self.schema else settings.fraud_contamination,
            "feature_count": len(self.schema.get("feature_names", [])) if self.schema else 12,
        }

    # ── Reference Price Estimator ──────────────────────────────────────────

    def estimate_reference_price(self, listing_type: str, device_type: str, brand_tier: str, condition: str, parts: Optional[list] = None) -> float:
        """Calculates an evidence-based market reference price for anomaly comparison."""
        if listing_type == "parts" and parts:
            total_part_ref = 0.0
            for p in parts:
                cat = getattr(p, "category", None) or (p.get("category") if isinstance(p, dict) else "other")
                base = PART_REFERENCE_PRICES.get(cat, 1500.0)
                cond = getattr(p, "condition", None) or (p.get("condition") if isinstance(p, dict) else "good")
                mult = CONDITION_MULTIPLIERS.get(cond, 0.8)
                total_part_ref += base * mult
            return max(total_part_ref, 500.0)

        base_device = DEVICE_REFERENCE_PRICES.get(device_type, 25000.0)
        brand_mult = BRAND_MULTIPLIERS.get(brand_tier, 1.0)
        cond_mult = CONDITION_MULTIPLIERS.get(condition, 0.8)
        return max(base_device * brand_mult * cond_mult, 1000.0)

    # ── Feature Vector Extraction ──────────────────────────────────────────

    def extract_listing_features(
        self,
        user_id: str,
        user_email: Optional[str],
        req: ListingCreateRequest,
        listing_id: Optional[str] = None,
    ) -> Tuple[np.ndarray, Dict[str, Any], List[str]]:
        """Extracts documented numerical features and human-readable indicators for a listing."""
        indicators: List[str] = []
        observed: Dict[str, Any] = {}

        # 1. Price analysis
        brand_tier = getattr(req, "brand_tier", None) or _infer_brand_tier(getattr(req, "brand", ""))
        condition = getattr(req, "condition", None) or "good"
        ref_price = self.estimate_reference_price(
            listing_type=req.listing_type,
            device_type=req.device_type,
            brand_tier=brand_tier,
            condition=condition,
            parts=req.parts,
        )
        observed["reference_price_inr"] = round(ref_price, 2)

        actual_price = req.price_inr
        if actual_price is None and req.parts:
            # sum parts prices
            actual_price = sum(
                (getattr(p, "price_inr", 0) or (p.get("price_inr", 0) if isinstance(p, dict) else 0))
                for p in req.parts
            )
        actual_price = float(actual_price or 0.0)
        observed["actual_price_inr"] = actual_price

        price_ratio = actual_price / max(ref_price, 1.0)
        price_deviation = abs(actual_price - ref_price) / max(ref_price, 1.0)
        observed["price_ratio"] = round(price_ratio, 3)
        observed["price_deviation_ratio"] = round(price_deviation, 3)

        price_outlier = 0.0
        if actual_price > 0 and price_ratio < 0.15:
            price_outlier = 1.0
            pct_below = round((1.0 - price_ratio) * 100)
            indicators.append(f"Implausibly low price: Rs. {actual_price:,.0f} is {pct_below}% below estimated market reference (Rs. {ref_price:,.0f}).")
        elif price_ratio > 3.5:
            price_outlier = 1.0
            pct_above = round((price_ratio - 1.0) * 100)
            indicators.append(f"Implausibly inflated price: Rs. {actual_price:,.0f} is {pct_above}% above market reference (Rs. {ref_price:,.0f}).")

        # 2. Listing velocity (past 1 hour)
        recent_listings_count = sqlite_store.count_user_listings_since(user_id, window_seconds=3600)
        observed["listings_in_last_1h"] = recent_listings_count
        if recent_listings_count >= 5:
            indicators.append(f"High submission rate: User created {recent_listings_count} listings in the past hour (exceeds threshold of 5).")

        # 3. Duplicate similarity check against existing active listings (excluding self)
        existing = sqlite_store.list_all(status="active", limit=150)
        max_similarity = 0.0
        similar_title = None
        for item in existing:
            # Skip comparing the listing against itself
            if listing_id and item.get("id") == listing_id:
                continue
            if item.get("seller_uid") == user_id:
                sim = _text_similarity(req.title, item.get("title", ""))
                if sim > max_similarity:
                    max_similarity = sim
                    similar_title = item.get("title", "")

        observed["max_duplicate_similarity"] = round(max_similarity, 3)
        if max_similarity >= 0.75:
            pct_sim = round(max_similarity * 100)
            indicators.append(f"Near-duplicate listing: Shares {pct_sim}% text similarity with existing active listing '{similar_title}'.")

        # 4. Missing specifications & description completeness
        desc = (req.description or "").strip()
        missing_specs_score = 0.0
        if len(desc) < 20:
            missing_specs_score += 0.4
            indicators.append("Minimal or absent description (fewer than 20 characters).")
        if not req.images:
            missing_specs_score += 0.4
            indicators.append("No photographic evidence provided for physical condition.")
        observed["missing_specs_score"] = round(min(missing_specs_score, 1.0), 2)

        # 5. Suspicious keywords check
        full_text = f"{req.title} {req.description}".lower()
        suspicious_flag = 0.0
        for kw in SUSPICIOUS_KEYWORDS:
            if kw in full_text:
                suspicious_flag = 1.0
                indicators.append(f"Contains flagged off-platform payment/contact term: '{kw}'.")
                break
        observed["suspicious_text_flag"] = suspicious_flag

        # 6. Auth history features for this account
        failed_logins_1h = sqlite_store.count_recent_security_events(
            event_type="login_failure", user_id=user_id, email=user_email, window_seconds=3600
        )
        login_successes_24h = sqlite_store.count_recent_security_events(
            event_type="login_success", user_id=user_id, email=user_email, window_seconds=86400
        )
        login_failures_24h = sqlite_store.count_recent_security_events(
            event_type="login_failure", user_id=user_id, email=user_email, window_seconds=86400
        )
        total_attempts = login_successes_24h + login_failures_24h
        failure_rate = (login_failures_24h / total_attempts) if total_attempts > 0 else 0.0

        observed["failed_logins_1h"] = failed_logins_1h
        observed["login_failure_rate_24h"] = round(failure_rate, 3)

        # Assemble feature vector matching FEATURE_NAMES:
        feature_vector = np.array([
            price_deviation,
            price_outlier,
            float(recent_listings_count),
            max_similarity,
            missing_specs_score,
            failure_rate,
            float(failed_logins_1h),
            float(login_successes_24h),
            30.0,
            0.0,
            0.0,
            suspicious_flag,
        ], dtype=np.float32)

        return feature_vector, observed, indicators

    # ── Anomaly Scoring & Calibration ──────────────────────────────────────

    def score_feature_vector(self, feature_vector: np.ndarray, deterministic_indicators: List[str]) -> Tuple[float, str]:
        """
        Runs Isolation Forest inference and calibrates raw decision function
        into normalized risk score [0.0, 1.0] and categorizes into Low, Medium, High, Critical.
        """
        self._load_model()

        if self.model is not None and self.schema is not None:
            min_raw = self.schema.get("min_raw_score", -0.22)
            max_raw = self.schema.get("max_raw_score", 0.19)
            cols = self.schema.get("feature_names") or self.schema.get("features")
            if cols and hasattr(self.model, "feature_names_in_"):
                df_input = pd.DataFrame([feature_vector], columns=cols)
                raw_score = float(self.model.decision_function(df_input)[0])
            else:
                raw_score = float(self.model.decision_function(feature_vector.reshape(1, -1))[0])
            span = max(max_raw - min_raw, 0.01)
            normalized_score = float(np.clip(1.0 - (raw_score - min_raw) / span, 0.0, 1.0))
        else:
            normalized_score = 0.10

        # Deterministic protection overrides:
        has_price_outlier = any("low price" in ind.lower() or "inflated price" in ind.lower() for ind in deterministic_indicators)
        has_suspicious_term = any("off-platform" in ind.lower() or "payment" in ind.lower() for ind in deterministic_indicators)
        has_duplicate_flood = any("near-duplicate" in ind.lower() for ind in deterministic_indicators)
        has_rate_limit = any("high submission" in ind.lower() for ind in deterministic_indicators)

        if (has_price_outlier and has_suspicious_term) or (has_duplicate_flood and has_rate_limit):
            normalized_score = max(normalized_score, 0.88)
        elif has_price_outlier or has_suspicious_term or has_duplicate_flood:
            normalized_score = max(normalized_score, 0.75)
        elif len(deterministic_indicators) >= 1:
            normalized_score = max(normalized_score, 0.52)

        # Risk categorization:
        # Low: 0.0 - 0.45, Medium: 0.45 - 0.70, High: 0.70 - 0.85, Critical: 0.85 - 1.00
        if normalized_score >= 0.85:
            risk_level = "critical"
        elif normalized_score >= 0.70:
            risk_level = "high"
        elif normalized_score >= 0.45:
            risk_level = "medium"
        else:
            risk_level = "low"

        return round(normalized_score, 3), risk_level

    # ── Evaluation Workflows ───────────────────────────────────────────────

    def evaluate_listing(
        self,
        seller_uid: str,
        seller_email: Optional[str],
        req: ListingCreateRequest,
        listing_id: Optional[str] = None,
    ) -> dict:
        """Evaluates a listing submission, records the assessment, and determines review flag."""
        feat_vec, observed, indicators = self.extract_listing_features(
            user_id=seller_uid,
            user_email=seller_email,
            req=req,
            listing_id=listing_id,
        )
        if listing_id:
            observed["listing_id"] = listing_id

        anomaly_score, risk_level = self.score_feature_vector(feat_vec, indicators)

        # Determine if the listing should be flagged for review
        # Policy: High or Critical risk listings are held for moderator review rather than deleted
        is_flagged = risk_level in ["high", "critical"]
        event_id = f"frd_{uuid.uuid4().hex[:12]}"
        now = _now_iso()

        model_version = self.schema.get("version", "heuristic_rule_engine") if self.schema else "heuristic_rule_engine"

        assessment_record = {
            "event_id": event_id,
            "user_id": seller_uid,
            "user_email": seller_email,
            "event_type": "listing_created",
            "entity_id": listing_id or req.title,
            "anomaly_score": anomaly_score,
            "risk_level": risk_level,
            "risk_indicators": indicators,
            "observed_features": observed,
            "model_version": model_version,
            "created_at": now,
            "review_status": "pending" if is_flagged else "resolved",
            "reviewer_id": None,
            "review_notes": None,
            "reviewed_at": None,
        }

        # Persist assessment record to SQLite
        sqlite_store.save_fraud_assessment(assessment_record)

        return {
            "is_flagged": is_flagged,
            "risk_level": risk_level,
            "anomaly_score": anomaly_score,
            "risk_indicators": indicators,
            "assessment_id": event_id,
        }

    def evaluate_matching_activity(
        self,
        user_id: str,
        device_type: str,
        brand: str,
        model_name: str,
        needed_part_category: str,
    ) -> Optional[dict]:
        """Monitors component matching query velocity to detect automated scraping or abuse."""
        now = datetime.now(timezone.utc)
        # Purge queries older than 10 minutes
        cutoff = now - timedelta(minutes=10)
        self._match_queries[user_id] = [t for t in self._match_queries[user_id] if t >= cutoff]
        self._match_queries[user_id].append(now)

        query_count = len(self._match_queries[user_id])
        query_sig = f"{device_type}:{brand}:{model_name}:{needed_part_category}".lower()
        self._match_criteria_history[user_id].append((now, query_sig))
        self._match_criteria_history[user_id] = [(t, s) for (t, s) in self._match_criteria_history[user_id] if t >= cutoff]

        # Calculate repeat query fraction
        sig_counts = defaultdict(int)
        for _, s in self._match_criteria_history[user_id]:
            sig_counts[s] += 1
        max_repeats = max(sig_counts.values()) if sig_counts else 0
        repeat_ratio = (max_repeats / query_count) if query_count > 0 else 0.0

        # Trigger anomaly if query count exceeds 30 in 10 minutes or repeat ratio > 0.85 with >= 15 queries
        if query_count >= 30 or (query_count >= 15 and repeat_ratio >= 0.85):
            # Debounce: avoid creating duplicate assessment records for the same incident within 10 minutes
            if not hasattr(self, "_last_match_alert"):
                self._last_match_alert = {}
            last_alert = self._last_match_alert.get(user_id)
            if last_alert and (now - last_alert).total_seconds() < 600:
                return None
            self._last_match_alert[user_id] = now

            event_id = f"frd_{uuid.uuid4().hex[:12]}"
            indicators = [
                f"Abnormal component matching query velocity: {query_count} requests in 10 minutes (exceeds threshold of 25).",
            ]
            if repeat_ratio >= 0.80:
                pct = round(repeat_ratio * 100)
                indicators.append(f"High query redundancy: {pct}% of requests repeated identical hardware search parameters.")

            observed = {
                "match_queries_10m": query_count,
                "repeat_query_ratio": round(repeat_ratio, 3),
                "query_signature": query_sig,
            }

            feat_vec = np.array([
                0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0, 30.0,
                float(query_count),
                float(repeat_ratio),
                0.0,
            ], dtype=np.float32)

            anomaly_score, risk_level = self.score_feature_vector(feat_vec, indicators)
            model_version = self.schema.get("version", "heuristic_rule_engine") if self.schema else "heuristic_rule_engine"

            record = {
                "event_id": event_id,
                "user_id": user_id,
                "user_email": None,
                "event_type": "match_request",
                "entity_id": query_sig,
                "anomaly_score": anomaly_score,
                "risk_level": risk_level,
                "risk_indicators": indicators,
                "observed_features": observed,
                "model_version": model_version,
                "created_at": _now_iso(),
                "review_status": "pending",
                "reviewer_id": None,
                "review_notes": None,
                "reviewed_at": None,
            }
            sqlite_store.save_fraud_assessment(record)
            return record

        return None

    def evaluate_auth_anomaly(
        self,
        user_id: str,
        email: str,
        failed_attempts: int,
        ip_address: Optional[str] = None,
    ) -> dict:
        """Triggered when brute-force threshold is reached to log an anomaly assessment."""
        event_id = f"frd_{uuid.uuid4().hex[:12]}"
        indicators = [
            f"Repeated authentication failures: {failed_attempts} failed login attempts in short window.",
            "Account protection cooldown activated to prevent credential stuffing.",
        ]
        observed = {
            "failed_attempts": failed_attempts,
            "ip_address": ip_address,
            "email": email,
        }

        feat_vec = np.array([
            0.0, 0.0, 0.0, 0.0, 0.0, 0.95,
            float(failed_attempts),
            0.0, 1.0, 0.0, 0.0, 0.0,
        ], dtype=np.float32)

        anomaly_score, risk_level = self.score_feature_vector(feat_vec, indicators)
        # Ensure brute force gets high or critical risk
        risk_level = "critical" if failed_attempts >= 8 else "high"
        anomaly_score = max(anomaly_score, 0.76)

        model_version = self.schema.get("version", "heuristic_rule_engine") if self.schema else "heuristic_rule_engine"

        record = {
            "event_id": event_id,
            "user_id": user_id,
            "user_email": email,
            "event_type": "login_attempt",
            "entity_id": email,
            "anomaly_score": anomaly_score,
            "risk_level": risk_level,
            "risk_indicators": indicators,
            "observed_features": observed,
            "model_version": model_version,
            "created_at": _now_iso(),
            "review_status": "pending",
            "reviewer_id": None,
            "review_notes": None,
            "reviewed_at": None,
        }
        sqlite_store.save_fraud_assessment(record)
        return record

    # ── Admin Monitoring Methods ───────────────────────────────────────────

    def get_admin_summary(self) -> dict:
        health = self.get_health_status()
        stats = sqlite_store.get_fraud_summary_stats()
        return {
            **stats,
            "model_version": health["model_version"],
            "model_health": "Active (Isolation Forest)" if health["model_loaded"] else "Active (Heuristic Engine)",
        }

    def list_assessments(
        self,
        risk_level: Optional[str] = None,
        event_type: Optional[str] = None,
        review_status: Optional[str] = None,
        search: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[dict], int]:
        return sqlite_store.list_fraud_assessments(
            risk_level=risk_level,
            event_type=event_type,
            review_status=review_status,
            search=search,
            limit=limit,
            offset=offset,
        )

    def get_assessment(self, assessment_id: str) -> Optional[dict]:
        return sqlite_store.get_fraud_assessment(assessment_id)

    def review_assessment(
        self,
        assessment_id: str,
        review_status: str,
        reviewer_id: str,
        review_notes: Optional[str] = None,
    ) -> Optional[dict]:
        updated = sqlite_store.update_fraud_assessment_review(
            assessment_id=assessment_id,
            review_status=review_status,
            reviewer_id=reviewer_id,
            review_notes=review_notes,
        )
        if updated:
            # Record audit trail action
            sqlite_store.save_admin_action({
                "id": f"act_{uuid.uuid4().hex[:12]}",
                "admin_uid": reviewer_id,
                "action_type": f"review_{review_status}",
                "target_id": assessment_id,
                "created_at": _now_iso(),
                "notes": review_notes,
            })
        return updated


fraud_service = FraudDetectionService()
