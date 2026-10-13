"""
Unit and Integration Tests for Component Reuse & Compatibility Engine.
Verifies compatibility rules, agent suite, reservation state machine, and atomic concurrency locking.
"""

import unittest
import uuid
import sys
import os

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.compatibility_engine import compatibility_engine
from app.agent_suite import (
    device_info_agent,
    diagnostic_summary_agent,
    matching_ranking_agent,
    value_comparison_agent,
    trust_moderation_agent,
)
from app import sqlite_store


class TestCompatibilityEngine(unittest.TestCase):

    def test_exact_model_match_returns_verified_compatible(self):
        res = compatibility_engine.evaluate(
            target_device_type="phone",
            target_brand="Apple",
            target_model_name="iPhone 12",
            needed_category="screen",
            candidate_brand="Apple",
            candidate_model_name="iPhone 12",
        )
        self.assertEqual(res.outcome, "VERIFIED_COMPATIBLE")
        self.assertGreaterEqual(res.compatibility_score, 85.0)
        self.assertTrue(len(res.supporting_evidence) > 0)

    def test_ddr4_vs_ddr5_ram_incompatibility(self):
        res = compatibility_engine.evaluate(
            target_device_type="laptop",
            target_brand="Dell",
            target_model_name="XPS 13 9310",
            needed_category="ram",
            candidate_brand="Dell",
            candidate_model_name="XPS 13 9300",
            candidate_specs={"interface_type": "DDR4", "target_interface": "DDR5"},
        )
        self.assertEqual(res.outcome, "INCOMPATIBLE")
        self.assertEqual(res.compatibility_score, 0.0)
        self.assertTrue(any("DDR4" in c for c in res.detected_conflicts))

    def test_cross_compatible_variant_rules(self):
        res = compatibility_engine.evaluate(
            target_device_type="phone",
            target_brand="Samsung",
            target_model_name="Galaxy S21 FE",
            needed_category="screen",
            candidate_brand="Samsung",
            candidate_model_name="Galaxy S21",
        )
        self.assertIn(res.outcome, ["VERIFIED_COMPATIBLE", "LIKELY_COMPATIBLE"])

    def test_unknown_compatibility_for_missing_data(self):
        res = compatibility_engine.evaluate(
            target_device_type="laptop",
            target_brand="UnknownBrand",
            target_model_name="XYZ 9000",
            needed_category="motherboard",
            candidate_brand="UnknownBrand",
            candidate_model_name="ABC 1000",
        )
        self.assertEqual(res.outcome, "UNKNOWN")


class TestAgentSuite(unittest.TestCase):

    def test_device_info_agent_extraction(self):
        info = device_info_agent.extract_info("Apple iPhone 12 Pro Max OLED Screen Replacement")
        self.assertEqual(info["brand"], "Apple")
        self.assertEqual(info["category"], "screen")

    def test_diagnostic_summary_agent(self):
        test_results = [
            {"test_name": "Touchscreen Test", "status": "PASS"},
            {"test_name": "Color Calibration", "status": "PASS"},
            {"test_name": "Backlight Test", "status": "PASS"},
        ]
        summary = diagnostic_summary_agent.summarize(
            damage_type="none",
            test_results=test_results,
            seller_declared_condition="excellent"
        )
        self.assertEqual(summary["verification_level"], "technician_verified")
        self.assertEqual(summary["passed_count"], 3)

    def test_trust_moderation_hazard_detection(self):
        mod = trust_moderation_agent.review_listing(
            title="iPhone 11 Replacement Battery",
            description="Battery is swollen and bulging slightly but still works",
            category="battery",
            price_inr=500.0,
        )
        self.assertTrue(mod["is_suspicious"])
        self.assertTrue(any("Swollen" in f for f in mod["flags"]))

    def test_value_comparison_agent(self):
        comp = value_comparison_agent.compare_options(
            part_cost_inr=2000.0,
            device_original_price_inr=40000.0,
            estimated_pro_repair_inr=6000.0
        )
        self.assertEqual(comp["total_self_repair_inr"], 2500.0)
        self.assertEqual(comp["savings_vs_pro_repair_inr"], 3500.0)
        self.assertEqual(comp["savings_vs_new_device_inr"], 37500.0)


class TestAtomicReservationStateMachine(unittest.TestCase):

    def setUp(self):
        self.listing_id = f"test_list_{uuid.uuid4().hex[:8]}"
        self.seller_uid = "seller_user_123"
        self.buyer_uid = "buyer_user_456"
        
        # Save a test active listing
        sqlite_store.save({
            "id": self.listing_id,
            "seller_uid": self.seller_uid,
            "created_at": "2026-10-02T23:00:00Z",
            "status": "active",
            "device_type": "phone",
            "brand": "Apple",
            "model_name": "iPhone 12",
            "listing_type": "whole_device",
            "title": "iPhone 12 Donor Device",
            "price_inr": 8000.0,
            "condition": "for_parts",
            "parts": [],
            "images": ["http://localhost/img.jpg"]
        })

    def test_atomic_reservation_success_and_double_selling_prevention(self):
        idem_key = f"idem_{uuid.uuid4().hex[:8]}"
        res_record = {
            "id": f"res_{uuid.uuid4().hex[:8]}",
            "listing_id": self.listing_id,
            "part_id": None,
            "buyer_uid": self.buyer_uid,
            "seller_uid": self.seller_uid,
            "status": "RESERVED",
            "created_at": "2026-10-02T23:05:00Z",
            "expires_at": "2026-10-04T23:05:00Z",
            "idempotency_key": idem_key,
            "buyer_notes": "Need screen assembly",
        }

        # First reservation succeeds
        result = sqlite_store.create_atomic_reservation(res_record)
        self.assertEqual(result["id"], res_record["id"])

        # Listing status updated to reserved
        updated_listing = sqlite_store.get(self.listing_id)
        self.assertEqual(updated_listing["status"], "reserved")

        # Second attempt by another buyer must raise ValueError (Unavailable)
        res_record_2 = dict(res_record)
        res_record_2["id"] = f"res_{uuid.uuid4().hex[:8]}"
        res_record_2["buyer_uid"] = "competing_buyer_789"
        res_record_2["idempotency_key"] = f"idem_{uuid.uuid4().hex[:8]}"

        with self.assertRaises(ValueError):
            sqlite_store.create_atomic_reservation(res_record_2)

    def test_idempotency_key_replay_returns_existing_reservation(self):
        idem_key = f"idem_replay_{uuid.uuid4().hex[:8]}"
        res_record = {
            "id": f"res_{uuid.uuid4().hex[:8]}",
            "listing_id": self.listing_id,
            "part_id": None,
            "buyer_uid": self.buyer_uid,
            "seller_uid": self.seller_uid,
            "status": "RESERVED",
            "created_at": "2026-10-02T23:05:00Z",
            "expires_at": "2026-10-04T23:05:00Z",
            "idempotency_key": idem_key,
            "buyer_notes": "First attempt",
        }
        r1 = sqlite_store.create_atomic_reservation(res_record)
        r2 = sqlite_store.create_atomic_reservation(res_record)
        self.assertEqual(r1["id"], r2["id"])


if __name__ == "__main__":
    unittest.main()
