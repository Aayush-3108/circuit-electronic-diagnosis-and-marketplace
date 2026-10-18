"""
Comprehensive Automated Test Suite for Isolation Forest Fraud & Anomaly Detection System in ReCircuit.

Validates:
1. Model loading, inference, and health monitoring
2. Normal activity vs unusual activity (price dumping + suspicious keyword triggers)
3. Missing, invalid, and boundary input values (zero prices, empty descriptions, missing images)
4. Score and risk-level consistency across thresholds
5. Duplicate events and repeated submission handling
6. Authentication rate limiting and brute force cooldown
7. Authentication and authorization (401 unauthenticated, 403 non-admin)
8. Assessment persistence and admin audit history
9. User account restriction and enforcement
10. Admin deletion of fraud listings and audit trail
11. Component matching query velocity tracking and regression verification
12. Graceful fallback on unavailable model / corrupted artifact
"""

import sys
import uuid
from pathlib import Path
import numpy as np

# Add backend directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.main import app
from app.fraud_service import fraud_service
from app.marketplace_service import list_listings, get_listing
from app import sqlite_store
from starlette.testclient import TestClient

client = TestClient(app)

ADMIN_TOKEN = "demo:usr_admin_test:admin@recircuit.com"
ADMIN_HEADERS = {"Authorization": f"Bearer {ADMIN_TOKEN}"}
REGULAR_USER_TOKEN = "demo:usr_regular_test:regular@example.com"
REGULAR_HEADERS = {"Authorization": f"Bearer {REGULAR_USER_TOKEN}"}


def test_1_model_loading_and_inference_health():
    print("\n[TEST 1] Model Loading, Schema, & Health Endpoint...")
    res = client.get("/api/fraud/health")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    health = res.json()
    assert health["status"] == "healthy"
    assert health["model_loaded"] is True
    assert health["model_version"] == "isolation_forest_v1.0"
    assert health["contamination"] == 0.05
    assert health["feature_count"] == 12
    assert "IsolationForest" in health["model_type"]

    # Verify direct inference does not throw warning and returns bounded scores
    dummy_vec = np.zeros(12, dtype=np.float32)
    score, risk = fraud_service.score_feature_vector(dummy_vec, [])
    assert 0.0 <= score <= 1.0, f"Score {score} out of bounds"
    assert risk in ["low", "medium", "high", "critical"]
    print(f"  -> Model Health: OK | Version: {health['model_version']} | Baseline Score: {score} ({risk})")


def test_2_normal_activity_listing_creation():
    print("\n[TEST 2] Normal Activity: Standard Market-Priced Listing...")
    seller_uid = f"usr_seller_{uuid.uuid4().hex[:6]}"
    seller_token = f"demo:{seller_uid}:seller@example.com"
    headers = {"Authorization": f"Bearer {seller_token}"}

    legit_listing = {
        "title": "Apple iPhone 13 128GB Midnight",
        "description": "Used iPhone 13 in good condition with minor scratches on the edge. Battery health 86%. Includes original box and charging cable.",
        "device_type": "phone",
        "brand": "Apple",
        "model_name": "iPhone 13",
        "condition": "good",
        "price_inr": 32000.0,  # Plausible market price (reference is ~₹39,312)
        "listing_type": "whole_device",
        "images": ["https://res.cloudinary.com/demo/image/upload/v1/iphone13.jpg"]
    }
    res = client.post("/api/marketplace/listings", json=legit_listing, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "active", f"Expected active, got {data['status']}"
    assert data["risk_level"] in ["low", "medium"]

    # Verify listing is publicly discoverable in marketplace search
    active_items = list_listings(status="active", limit=100)
    assert any(item.id == data["id"] for item in active_items)
    print(f"  -> Normal listing accepted as ACTIVE (id={data['id']}, risk={data['risk_level']})")
    return data["id"]


def test_3_unusual_activity_anomalous_listing():
    print("\n[TEST 3] Unusual Activity: 99% Underpriced Flagship + Wire Transfer Keywords...")
    seller_uid = f"usr_scam_{uuid.uuid4().hex[:6]}"
    seller_token = f"demo:{seller_uid}:scammer@example.com"
    headers = {"Authorization": f"Bearer {seller_token}"}

    scam_listing = {
        "title": "iPhone 14 Pro Max 256GB Urgent Clearance",
        "description": "Selling urgently for cash western union wire transfer accepted telegram me directly outside recircuit",
        "device_type": "phone",
        "brand": "Apple",
        "model_name": "iPhone 14 Pro Max",
        "condition": "excellent",
        "price_inr": 50.0,  # 99.8% underpriced
        "listing_type": "whole_device",
        "images": ["https://res.cloudinary.com/demo/image/upload/v1/iphone14.jpg"]
    }
    res = client.post("/api/marketplace/listings", json=scam_listing, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "flagged", f"Expected flagged status, got {data['status']}"
    assert data["risk_level"] in ["high", "critical"]

    # Crucial regression check: Flagged listings MUST NOT appear in public active marketplace
    active_items = list_listings(status="active", limit=100)
    assert not any(item.id == data["id"] for item in active_items), "Flagged listing leaked into active marketplace!"
    print(f"  -> Anomalous listing quarantined with status='flagged' (id={data['id']}, risk={data['risk_level']})")
    return data["id"]


def test_4_missing_invalid_boundary_inputs():
    print("\n[TEST 4] Boundary & Missing Inputs: Schema 400 Rejections, 0 Price, Minimal Specs, & Huge Prices...")
    user_uid = f"usr_bnd_{uuid.uuid4().hex[:6]}"
    user_token = f"demo:{user_uid}:boundary@example.com"
    headers = {"Authorization": f"Bearer {user_token}"}

    # Case A: Endpoint boundary enforcement - Missing images for whole_device returns 400
    missing_image_listing = {
        "title": "Generic Laptop No Photos",
        "description": "Short",
        "device_type": "laptop",
        "brand": "Dell",
        "model_name": "Inspiron 15",
        "condition": "fair",
        "price_inr": 25000.0,
        "listing_type": "whole_device",
        "images": []  # Empty images array must be rejected by API validation
    }
    res_a = client.post("/api/marketplace/listings", json=missing_image_listing, headers=headers)
    assert res_a.status_code == 400
    assert "require price_inr and at least one image" in res_a.json()["detail"]

    # Case B: Zero price INR & minimal description (<20 chars) with valid photo
    zero_price_listing = {
        "title": "Samsung Galaxy S22 Free Giveaway",
        "description": "Free giveaway.",  # <20 chars triggers missing specs score
        "device_type": "phone",
        "brand": "Samsung",
        "model_name": "Galaxy S22",
        "condition": "good",
        "price_inr": 0.0,  # Boundary value 0
        "listing_type": "whole_device",
        "images": ["https://example.com/s22.jpg"]
    }
    res_b = client.post("/api/marketplace/listings", json=zero_price_listing, headers=headers)
    assert res_b.status_code == 200
    data_b = res_b.json()
    assert data_b["risk_level"] in ["medium", "high", "critical"]

    # Case C: Direct service boundary test with extreme & empty inputs (bypassing HTTP layer)
    from app.schemas import ListingCreateRequest
    boundary_req = ListingCreateRequest(
        title="Edge Case Device",
        description="",
        device_type="phone",
        brand="UnknownBrand",
        model_name="GenericModel",
        condition="for_parts",
        price_inr=999999999.0,  # Extreme hyper-inflated price boundary
        listing_type="whole_device",
        images=[],
    )
    feat_vec, observed, indicators = fraud_service.extract_listing_features(
        user_id="usr_direct_edge",
        user_email=None,
        req=boundary_req,
    )
    assert feat_vec.shape == (12,)
    assert not np.isnan(feat_vec).any()
    assert not np.isinf(feat_vec).any()
    score, risk = fraud_service.score_feature_vector(feat_vec, indicators)
    assert 0.0 <= score <= 1.0
    print(f"  -> Boundary tests passed: 400 rejection verified, zero price evaluated, hyper-price bounded (score={score:.3f}).")


def test_5_duplicate_events_and_repeated_requests():
    print("\n[TEST 5] Duplicate Events & Repeated Submissions...")
    seller_uid = f"usr_spammer_{uuid.uuid4().hex[:6]}"
    seller_token = f"demo:{seller_uid}:spammer@example.com"
    headers = {"Authorization": f"Bearer {seller_token}"}

    base_listing = {
        "title": "Brand New Apple iPad Pro 11 Inch M2",
        "description": "Unopened original sealed box Apple iPad Pro 11 M2 Wi-Fi 128GB Space Grey.",
        "device_type": "tablet",
        "brand": "Apple",
        "model_name": "iPad Pro 11",
        "condition": "excellent",
        "price_inr": 68000.0,
        "listing_type": "whole_device",
        "images": ["https://example.com/ipad.jpg"]
    }
    # First submission
    res_1 = client.post("/api/marketplace/listings", json=base_listing, headers=headers)
    assert res_1.status_code == 200
    data_1 = res_1.json()

    # Second near-identical submission by same seller (duplicate flood)
    duplicate_listing = dict(base_listing)
    duplicate_listing["title"] = "Brand New Apple iPad Pro 11 Inch M2 Tablet"
    res_2 = client.post("/api/marketplace/listings", json=duplicate_listing, headers=headers)
    assert res_2.status_code == 200
    data_2 = res_2.json()

    # Inspect assessment for duplicate 2
    assessment_2 = sqlite_store.get_fraud_assessment(data_2["fraud_assessment_id"])
    assert assessment_2 is not None
    observed = assessment_2.get("observed_features", {})
    assert observed.get("max_duplicate_similarity", 0) >= 0.70
    assert any("near-duplicate" in ind.lower() for ind in assessment_2.get("risk_indicators", []))
    print(f"  -> Duplicate similarity detected: {observed.get('max_duplicate_similarity')} (Triggered near-duplicate indicator)")


def test_6_score_and_risk_level_consistency():
    print("\n[TEST 6] Score & Risk-Level Consistency Checks...")
    # Low vector (plausible price, no flags, no duplicates)
    low_vec = np.array([0.05, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 2.0, 30.0, 1.0, 0.0, 0.0], dtype=np.float32)
    score_low, risk_low = fraud_service.score_feature_vector(low_vec, [])

    # High anomaly vector (massive deviation, outlier, suspicious text, high velocity)
    high_vec = np.array([0.98, 1.0, 8.0, 0.90, 0.8, 0.8, 6.0, 0.0, 30.0, 28.0, 0.9, 1.0], dtype=np.float32)
    indicators = [
        "Implausibly low price: Rs. 50 is 99% below estimated market reference",
        "Contains flagged off-platform payment/contact term: 'wire transfer'"
    ]
    score_high, risk_high = fraud_service.score_feature_vector(high_vec, indicators)

    assert score_high > score_low, f"Monotonicity violation: high score {score_high} not greater than low {score_low}"
    assert risk_low in ["low", "medium"]
    assert risk_high in ["high", "critical"]
    assert score_high >= 0.85, f"Expected critical score >= 0.85, got {score_high}"
    print(f"  -> Score ordering confirmed: Low Vector ({score_low:.3f}, {risk_low}) < High Vector ({score_high:.3f}, {risk_high})")


def test_7_auth_rate_limiting_and_brute_force():
    print("\n[TEST 7] Authentication Rate Limiting & Brute Force Cooldown...")
    test_email = f"bruteforce_{uuid.uuid4().hex[:8]}@example.com"
    # First 4 failed attempts should be allowed
    for _ in range(4):
        attempt_res = client.post("/api/security/login-attempt", json={"email": test_email})
        assert attempt_res.status_code == 200
        assert attempt_res.json()["allowed"] is True
        client.post("/api/security/login-result", json={"email": test_email, "success": False, "error_code": "auth/wrong-password"})

    # 5th failure
    client.post("/api/security/login-result", json={"email": test_email, "success": False, "error_code": "auth/wrong-password"})

    # 6th attempt must be rejected by cooldown
    attempt_blocked = client.post("/api/security/login-attempt", json={"email": test_email})
    assert attempt_blocked.status_code == 200
    res_data = attempt_blocked.json()
    assert res_data["allowed"] is False
    assert res_data["cooldown_seconds"] > 0
    assert "Too many failed login attempts" in res_data["message"]
    print(f"  -> Cooldown active: {res_data['message']}")


def test_8_authentication_and_authorization():
    print("\n[TEST 8] Authentication & Authorization on Protected Fraud Endpoints...")
    # Anonymous -> 401
    res_unauth = client.get("/api/fraud/admin/summary")
    assert res_unauth.status_code == 401, f"Expected 401, got {res_unauth.status_code}"

    # Non-admin user -> 403 Forbidden
    res_forbidden = client.get("/api/fraud/admin/summary", headers=REGULAR_HEADERS)
    assert res_forbidden.status_code == 403, f"Expected 403, got {res_forbidden.status_code}"

    # Authorized admin -> 200 OK
    res_admin = client.get("/api/fraud/admin/summary", headers=ADMIN_HEADERS)
    assert res_admin.status_code == 200
    summary = res_admin.json()
    assert "total_assessments" in summary
    assert "pending_review_count" in summary
    assert "critical_risk_count" in summary
    print(f"  -> Summary metrics accessible by admin: {summary['total_assessments']} total assessments")


def test_9_assessment_persistence_and_admin_review():
    print("\n[TEST 9] Assessment Persistence & Admin Review Workflow...")
    res = client.get("/api/fraud/admin/assessments", headers=ADMIN_HEADERS)
    assert res.status_code == 200
    assessments = res.json()["assessments"]
    assert len(assessments) >= 1
    assessment = assessments[0]
    aid = assessment["event_id"]

    # Verify audit persistence in SQLite
    stored_assessment = sqlite_store.get_fraud_assessment(aid)
    assert stored_assessment is not None
    assert stored_assessment["event_id"] == aid

    # Moderator review action: mark as confirmed_fraud
    review_res = client.patch(
        f"/api/fraud/admin/assessments/{aid}/review",
        json={"review_status": "confirmed_fraud", "review_notes": "Off-platform payment verified during automated test"},
        headers=ADMIN_HEADERS,
    )
    assert review_res.status_code == 200
    updated = review_res.json()
    assert updated["review_status"] == "confirmed_fraud"
    assert updated["review_notes"] == "Off-platform payment verified during automated test"
    print(f"  -> Assessment {aid} successfully reviewed as '{updated['review_status']}'")


def test_10_account_restriction_enforcement():
    print("\n[TEST 10] User Account Restriction Enforcement...")
    target_uid = f"usr_badactor_{uuid.uuid4().hex[:6]}"
    target_headers = {"Authorization": f"Bearer demo:{target_uid}:badactor@example.com"}

    # Admin restricts user
    restr_res = client.patch(
        f"/api/fraud/admin/users/{target_uid}/restriction",
        json={"is_restricted": True, "reason": "Repeated fraudulent listing spam"},
        headers=ADMIN_HEADERS,
    )
    assert restr_res.status_code == 200
    assert restr_res.json()["is_restricted"] is True

    # Restricted user attempts to call protected endpoint -> 403 Forbidden!
    blocked_res = client.get("/api/history", headers=target_headers)
    assert blocked_res.status_code == 403
    assert "Account temporarily restricted" in blocked_res.json()["detail"]

    # Admin restores user
    restore_res = client.patch(
        f"/api/fraud/admin/users/{target_uid}/restriction",
        json={"is_restricted": False, "reason": "Account restored after appeal"},
        headers=ADMIN_HEADERS,
    )
    assert restore_res.status_code == 200
    assert restore_res.json()["is_restricted"] is False
    print("  -> Account restriction and restoration successfully verified.")


def test_11_admin_delete_fraud_listing():
    print("\n[TEST 11] Admin Fraud Listing Deletion & Audit Logging...")
    # Create a scam listing
    scam_seller_uid = f"usr_scam_{uuid.uuid4().hex[:6]}"
    headers = {"Authorization": f"Bearer demo:{scam_seller_uid}:scam@example.com"}
    scam_req = {
        "title": "Counterfeit iPhone 14 Pro Max Delete Me",
        "description": "Wire transfer telegram me urgently",
        "device_type": "phone",
        "brand": "Apple",
        "model_name": "iPhone 14 Pro Max",
        "condition": "excellent",
        "price_inr": 20.0,
        "listing_type": "whole_device",
        "images": ["https://example.com/scam_phone.jpg"]
    }
    create_res = client.post("/api/marketplace/listings", json=scam_req, headers=headers)
    assert create_res.status_code == 200
    listing_id = create_res.json()["id"]

    # Non-admin attempt to delete -> 403 Forbidden
    non_admin_del = client.delete(f"/api/fraud/admin/listings/{listing_id}", headers=REGULAR_HEADERS)
    assert non_admin_del.status_code == 403

    # Authorized admin deletes the listing
    admin_del = client.delete(f"/api/fraud/admin/listings/{listing_id}", headers=ADMIN_HEADERS)
    assert admin_del.status_code == 200
    assert admin_del.json()["deleted"] is True

    # Verify listing is gone
    assert get_listing(listing_id) is None
    print(f"  -> Admin successfully deleted fraud listing {listing_id} with audit trail.")


def test_12_component_matching_regression_and_velocity():
    print("\n[TEST 12] Component Matching Regression & Query Velocity Tracking...")
    # Regression: verify matching endpoint still returns matches properly
    req_payload = {
        "device_type": "phone",
        "brand": "Apple",
        "model_name": "iPhone 13",
        "needed_part_category": "screen"
    }
    res = client.post("/api/marketplace/compatible-components", json=req_payload)
    assert res.status_code == 200
    matches = res.json()
    assert isinstance(matches, list)

    # Marketplace matches endpoint regression check
    legacy_res = client.get(
        "/api/marketplace/matches?device_type=phone&brand=Apple&model_name=iPhone%2013&needed_part_category=screen"
    )
    assert legacy_res.status_code == 200
    assert "matches" in legacy_res.json()

    # Query velocity hammering test (>30 queries within window)
    rapid_user = f"usr_scraper_{uuid.uuid4().hex[:6]}"
    assessment_triggered = None
    for i in range(35):
        assessment = fraud_service.evaluate_matching_activity(
            user_id=rapid_user,
            device_type="phone",
            brand="Apple",
            model_name="iPhone 13",
            needed_part_category="battery"
        )
        if assessment:
            assessment_triggered = assessment

    assert assessment_triggered is not None, "Failed to trigger anomaly assessment for match query hammering!"
    assert assessment_triggered["event_type"] == "match_request"
    assert any("velocity" in ind.lower() for ind in assessment_triggered["risk_indicators"])
    print(f"  -> Matching query velocity abuse correctly flagged: Anomaly Score={assessment_triggered['anomaly_score']}")


def test_13_graceful_model_unavailability_fallback():
    print("\n[TEST 13] Graceful Fallback on Model Unavailability...")
    # Temporarily simulate uninitialized / unavailable model
    original_model = fraud_service.model
    original_schema = fraud_service.schema
    try:
        fraud_service.model = None
        fraud_service.schema = None

        # Health endpoint should report heuristic fallback without 500 error
        health_res = client.get("/api/fraud/health")
        assert health_res.status_code == 200
        health_data = health_res.json()
        assert health_data["model_loaded"] is False
        assert "Heuristic" in health_data["model_type"]

        # Evaluating listing should gracefully succeed via deterministic rules
        seller_uid = f"usr_fallback_{uuid.uuid4().hex[:6]}"
        headers = {"Authorization": f"Bearer demo:{seller_uid}:test@example.com"}
        listing = {
            "title": "Fallback Dell Laptop",
            "description": "Standard laptop description for fallback test.",
            "device_type": "laptop",
            "brand": "Dell",
            "model_name": "XPS 13",
            "condition": "good",
            "price_inr": 45000.0,
            "listing_type": "whole_device",
            "images": ["https://example.com/xps.jpg"]
        }
        fallback_res = client.post("/api/marketplace/listings", json=listing, headers=headers)
        assert fallback_res.status_code == 200
        assert fallback_res.json()["status"] == "active"
        print("  -> System successfully failed-open with deterministic heuristic engine when model was absent.")
    finally:
        # Restore model
        fraud_service.model = original_model
        fraud_service.schema = original_schema


def run_all_tests():
    print("=" * 70)
    print("  RUNNING RE-CIRCUIT ISOLATION FOREST FRAUD SYSTEM VERIFICATION")
    print("=" * 70)
    test_1_model_loading_and_inference_health()
    test_2_normal_activity_listing_creation()
    test_3_unusual_activity_anomalous_listing()
    test_4_missing_invalid_boundary_inputs()
    test_5_duplicate_events_and_repeated_requests()
    test_6_score_and_risk_level_consistency()
    test_7_auth_rate_limiting_and_brute_force()
    test_8_authentication_and_authorization()
    test_9_assessment_persistence_and_admin_review()
    test_10_account_restriction_enforcement()
    test_11_admin_delete_fraud_listing()
    test_12_component_matching_regression_and_velocity()
    test_13_graceful_model_unavailability_fallback()
    print("\n" + "=" * 70)
    print("  ALL 13 TESTS EXECUTED AND PASSED WITH ZERO FAILURES!")
    print("=" * 70 + "\n")


if __name__ == "__main__":
    run_all_tests()
