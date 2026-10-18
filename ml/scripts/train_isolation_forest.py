"""
Isolation Forest Fraud & Anomaly Detection Training Script for ReCircuit.

This script trains an unsupervised Isolation Forest model (scikit-learn) to detect:
1. Account/auth anomalies (brute force, rapid login anomalies)
2. Marketplace listing anomalies (price dumping/gouging, rapid duplicate flooding, suspicious patterns)
3. Component matching abuse (query hammering, bot scraping)
4. Suspicious content / incomplete specifications

Saves:
- backend/models/isolation_forest_fraud.joblib
- backend/models/fraud_feature_schema.joblib
"""

import os
from pathlib import Path
import numpy as np
import pandas as pd
import joblib
from sklearn.ensemble import IsolationForest

FEATURE_NAMES = [
    "price_deviation_ratio",        # Deviation from reference price: abs(price - ref) / ref
    "price_outlier_flag",           # 1 if price < 0.15*ref or price > 3.5*ref, else 0
    "listing_velocity_1h",          # Number of listings created in last 1 hour
    "duplicate_similarity_score",   # Jaccard/text similarity to recent listings (0.0 - 1.0)
    "missing_specs_score",          # Fraction of optional specifications missing (0.0 - 1.0)
    "login_failure_rate_24h",       # Ratio of failed logins to total attempts (0.0 - 1.0)
    "failed_logins_1h",             # Count of failed login attempts in last 1 hour
    "rapid_login_velocity_1h",      # Count of successful logins in last 1 hour
    "account_age_days",             # Days since account registration
    "match_query_velocity_1h",      # Number of component matching requests in last 1 hour
    "repeat_matching_ratio",        # Ratio of identical repeat queries (0.0 - 1.0)
    "suspicious_text_flag",         # 1 if suspicious contact/payment keywords present, else 0
]

MODEL_VERSION = "isolation_forest_v1.0"


def generate_synthetic_dataset(n_samples: int = 10000, random_state: int = 42) -> pd.DataFrame:
    """
    Generates a realistic synthetic behavioral dataset with ~95% legitimate behavior
    and ~5% simulated anomalous scenarios for unsupervised learning & validation.
    """
    rng = np.random.default_rng(random_state)
    n_normal = int(n_samples * 0.95)
    n_anomaly = n_samples - n_normal

    # --- 1. Normal User Activity (95%) ---
    # Price deviations are modest (-25% to +35%)
    norm_price_dev = np.abs(rng.normal(loc=0.10, scale=0.12, size=n_normal))
    norm_price_outlier = np.zeros(n_normal, dtype=float)

    # Ordinary listing velocity: usually 0, 1, or rarely 2 in an hour
    norm_listing_vel = rng.poisson(lam=0.3, size=n_normal).astype(float)

    # Duplicate similarity: low, distinct items
    norm_dup_sim = rng.beta(a=1, b=8, size=n_normal)

    # Missing specs score: low to moderate
    norm_missing_specs = rng.beta(a=1.5, b=4, size=n_normal)

    # Auth behavior: mostly successful, occasional typos
    norm_fail_rate = rng.beta(a=0.5, b=15, size=n_normal)
    norm_failed_logins = rng.binomial(n=2, p=0.08, size=n_normal).astype(float)
    norm_rapid_logins = rng.poisson(lam=0.8, size=n_normal).astype(float)

    # Account age: active accounts (1 to 365 days)
    norm_account_age = rng.uniform(5, 365, size=n_normal)

    # Matching query velocity: 0 to 4 queries per hour
    norm_match_vel = rng.poisson(lam=1.0, size=n_normal).astype(float)
    norm_repeat_match = rng.beta(a=1, b=6, size=n_normal)

    # Suspicious text: none
    norm_suspicious_text = np.zeros(n_normal, dtype=float)

    df_normal = pd.DataFrame({
        "price_deviation_ratio": norm_price_dev,
        "price_outlier_flag": norm_price_outlier,
        "listing_velocity_1h": norm_listing_vel,
        "duplicate_similarity_score": norm_dup_sim,
        "missing_specs_score": norm_missing_specs,
        "login_failure_rate_24h": norm_fail_rate,
        "failed_logins_1h": norm_failed_logins,
        "rapid_login_velocity_1h": norm_rapid_logins,
        "account_age_days": norm_account_age,
        "match_query_velocity_1h": norm_match_vel,
        "repeat_matching_ratio": norm_repeat_match,
        "suspicious_text_flag": norm_suspicious_text,
    })

    # --- 2. Anomalous Activity (5%) ---
    # Scenario A: Brute Force / Account Takeover (20% of anomalies)
    nA = int(n_anomaly * 0.20)
    dev_A = pd.DataFrame({
        "price_deviation_ratio": np.zeros(nA),
        "price_outlier_flag": np.zeros(nA),
        "listing_velocity_1h": np.zeros(nA),
        "duplicate_similarity_score": np.zeros(nA),
        "missing_specs_score": rng.uniform(0.1, 0.4, size=nA),
        "login_failure_rate_24h": rng.uniform(0.75, 1.0, size=nA),
        "failed_logins_1h": rng.integers(6, 25, size=nA).astype(float),
        "rapid_login_velocity_1h": rng.integers(0, 3, size=nA).astype(float),
        "account_age_days": rng.uniform(0.1, 10, size=nA),
        "match_query_velocity_1h": np.zeros(nA),
        "repeat_matching_ratio": np.zeros(nA),
        "suspicious_text_flag": np.zeros(nA),
    })

    # Scenario B: Marketplace Spam / Duplicate Flooding (25% of anomalies)
    nB = int(n_anomaly * 0.25)
    dev_B = pd.DataFrame({
        "price_deviation_ratio": rng.uniform(0.3, 1.2, size=nB),
        "price_outlier_flag": rng.choice([0.0, 1.0], p=[0.7, 0.3], size=nB),
        "listing_velocity_1h": rng.integers(6, 30, size=nB).astype(float),
        "duplicate_similarity_score": rng.uniform(0.75, 1.0, size=nB),
        "missing_specs_score": rng.uniform(0.5, 0.95, size=nB),
        "login_failure_rate_24h": np.zeros(nB),
        "failed_logins_1h": np.zeros(nB),
        "rapid_login_velocity_1h": rng.integers(1, 4, size=nB).astype(float),
        "account_age_days": rng.uniform(0.1, 5, size=nB),
        "match_query_velocity_1h": rng.integers(0, 3, size=nB).astype(float),
        "repeat_matching_ratio": np.zeros(nB),
        "suspicious_text_flag": rng.choice([0.0, 1.0], p=[0.6, 0.4], size=nB),
    })

    # Scenario C: Price Scam / Implausible Value (25% of anomalies)
    nC = int(n_anomaly * 0.25)
    dev_C = pd.DataFrame({
        "price_deviation_ratio": rng.uniform(1.8, 5.0, size=nC),
        "price_outlier_flag": np.ones(nC, dtype=float),
        "listing_velocity_1h": rng.integers(1, 5, size=nC).astype(float),
        "duplicate_similarity_score": rng.uniform(0.1, 0.6, size=nC),
        "missing_specs_score": rng.uniform(0.4, 0.9, size=nC),
        "login_failure_rate_24h": np.zeros(nC),
        "failed_logins_1h": np.zeros(nC),
        "rapid_login_velocity_1h": rng.integers(1, 3, size=nC).astype(float),
        "account_age_days": rng.uniform(0.5, 15, size=nC),
        "match_query_velocity_1h": np.zeros(nC),
        "repeat_matching_ratio": np.zeros(nC),
        "suspicious_text_flag": rng.choice([0.0, 1.0], p=[0.5, 0.5], size=nC),
    })

    # Scenario D: Scraping / Matching Bot Abuse (30% of anomalies)
    nD = n_anomaly - (nA + nB + nC)
    dev_D = pd.DataFrame({
        "price_deviation_ratio": np.zeros(nD),
        "price_outlier_flag": np.zeros(nD),
        "listing_velocity_1h": np.zeros(nD),
        "duplicate_similarity_score": np.zeros(nD),
        "missing_specs_score": np.zeros(nD),
        "login_failure_rate_24h": np.zeros(nD),
        "failed_logins_1h": np.zeros(nD),
        "rapid_login_velocity_1h": rng.integers(1, 5, size=nD).astype(float),
        "account_age_days": rng.uniform(0.1, 30, size=nD),
        "match_query_velocity_1h": rng.integers(35, 200, size=nD).astype(float),
        "repeat_matching_ratio": rng.uniform(0.70, 0.99, size=nD),
        "suspicious_text_flag": np.zeros(nD),
    })

    df = pd.concat([df_normal, dev_A, dev_B, dev_C, dev_D], ignore_index=True)
    df = df.sample(frac=1.0, random_state=random_state).reset_index(drop=True)
    return df


def train_and_evaluate():
    print("=" * 65)
    print("  ReCircuit: Training Isolation Forest Anomaly Detection Model")
    print("=" * 65)

    df_train = generate_synthetic_dataset(n_samples=12000, random_state=42)
    print(f"Generated training dataset: {df_train.shape[0]} rows, {df_train.shape[1]} features.")

    # Train Isolation Forest
    contamination = 0.05
    iso = IsolationForest(
        n_estimators=150,
        max_samples="auto",
        contamination=contamination,
        random_state=42,
        n_jobs=-1,
    )
    iso.fit(df_train[FEATURE_NAMES])
    print(f"Model trained successfully with {iso.n_estimators} estimators, contamination={contamination}.")

    # Evaluate decision_function score range for calibration
    raw_scores = iso.decision_function(df_train[FEATURE_NAMES])
    min_raw = float(np.min(raw_scores))
    max_raw = float(np.max(raw_scores))
    print(f"Raw decision_function distribution: min={min_raw:.4f}, mean={np.mean(raw_scores):.4f}, max={max_raw:.4f}")

    # Test on known simulated validation scenarios
    print("\n--- Model Validation on Scenarios ---")
    val_normal = pd.DataFrame([{
        "price_deviation_ratio": 0.05,
        "price_outlier_flag": 0.0,
        "listing_velocity_1h": 1.0,
        "duplicate_similarity_score": 0.08,
        "missing_specs_score": 0.15,
        "login_failure_rate_24h": 0.0,
        "failed_logins_1h": 0.0,
        "rapid_login_velocity_1h": 1.0,
        "account_age_days": 60.0,
        "match_query_velocity_1h": 2.0,
        "repeat_matching_ratio": 0.1,
        "suspicious_text_flag": 0.0,
    }])[FEATURE_NAMES]

    val_brute_force = pd.DataFrame([{
        "price_deviation_ratio": 0.0,
        "price_outlier_flag": 0.0,
        "listing_velocity_1h": 0.0,
        "duplicate_similarity_score": 0.0,
        "missing_specs_score": 0.0,
        "login_failure_rate_24h": 0.95,
        "failed_logins_1h": 12.0,
        "rapid_login_velocity_1h": 0.0,
        "account_age_days": 1.0,
        "match_query_velocity_1h": 0.0,
        "repeat_matching_ratio": 0.0,
        "suspicious_text_flag": 0.0,
    }])[FEATURE_NAMES]

    val_flooding = pd.DataFrame([{
        "price_deviation_ratio": 0.4,
        "price_outlier_flag": 0.0,
        "listing_velocity_1h": 15.0,
        "duplicate_similarity_score": 0.92,
        "missing_specs_score": 0.7,
        "login_failure_rate_24h": 0.0,
        "failed_logins_1h": 0.0,
        "rapid_login_velocity_1h": 2.0,
        "account_age_days": 2.0,
        "match_query_velocity_1h": 1.0,
        "repeat_matching_ratio": 0.0,
        "suspicious_text_flag": 0.0,
    }])[FEATURE_NAMES]

    val_price_dump = pd.DataFrame([{
        "price_deviation_ratio": 3.2,
        "price_outlier_flag": 1.0,
        "listing_velocity_1h": 2.0,
        "duplicate_similarity_score": 0.1,
        "missing_specs_score": 0.6,
        "login_failure_rate_24h": 0.0,
        "failed_logins_1h": 0.0,
        "rapid_login_velocity_1h": 1.0,
        "account_age_days": 1.0,
        "match_query_velocity_1h": 0.0,
        "repeat_matching_ratio": 0.0,
        "suspicious_text_flag": 1.0,
    }])[FEATURE_NAMES]

    for name, sample in [
        ("Normal User", val_normal),
        ("Brute Force Attacker", val_brute_force),
        ("Listing Flood Spammer", val_flooding),
        ("Price Dump / Scam", val_price_dump),
    ]:
        raw = float(iso.decision_function(sample)[0])
        pred = int(iso.predict(sample)[0])  # +1 normal, -1 outlier
        # Transform raw score to normalized [0, 1] risk score
        risk = float(np.clip(1.0 - (raw - min_raw) / (max_raw - min_raw), 0.0, 1.0))
        label = "ANOMALY / HIGH RISK" if pred == -1 or risk > 0.65 else "NORMAL"
        print(f"  [{label}] {name:25s} -> Raw Score: {raw:+.4f} | Calibrated Risk: {risk:.3f}")

    # Prepare directories and save artifacts
    models_dir = Path(__file__).resolve().parents[2] / "backend" / "models"
    models_dir.mkdir(parents=True, exist_ok=True)

    model_path = models_dir / "isolation_forest_fraud.joblib"
    schema_path = models_dir / "fraud_feature_schema.joblib"

    schema_metadata = {
        "version": MODEL_VERSION,
        "feature_names": FEATURE_NAMES,
        "contamination": contamination,
        "min_raw_score": min_raw,
        "max_raw_score": max_raw,
        "reference_thresholds": {
            "max_failed_logins_1h": 5,
            "max_listing_velocity_1h": 5,
            "max_match_query_velocity_1h": 25,
            "high_duplicate_similarity": 0.70,
            "high_price_deviation": 1.50,
        },
        "risk_levels": {
            "low": [0.0, 0.45],
            "medium": [0.45, 0.70],
            "high": [0.70, 0.85],
            "critical": [0.85, 1.00],
        }
    }

    joblib.dump(iso, model_path)
    joblib.dump(schema_metadata, schema_path)
    print(f"\nSaved model: {model_path} ({model_path.stat().st_size / 1024:.1f} KB)")
    print(f"Saved schema metadata: {schema_path}")
    print("=" * 65)


if __name__ == "__main__":
    train_and_evaluate()
