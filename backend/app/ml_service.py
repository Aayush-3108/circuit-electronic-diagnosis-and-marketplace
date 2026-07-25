"""
Loads the three trained models (recommendation classifier, repair cost regressor,
resale value regressor) plus the categorical encoder, and exposes a single
`predict()` function the API routes call.
"""

from pathlib import Path

import joblib
import numpy as np

MODELS_DIR = Path(__file__).resolve().parents[1] / "models"


class DecisionEngine:
    def __init__(self):
        self.clf = joblib.load(MODELS_DIR / "recommendation_classifier.joblib")
        self.repair_model = joblib.load(MODELS_DIR / "repair_cost_regressor.joblib")
        self.resale_model = joblib.load(MODELS_DIR / "resale_value_regressor.joblib")
        self.encoder = joblib.load(MODELS_DIR / "categorical_encoder.joblib")
        schema = joblib.load(MODELS_DIR / "feature_schema.joblib")
        self.numeric_cols = schema["numeric_cols"]
        self.categorical_cols = schema["categorical_cols"]

    def _build_feature_vector(
        self,
        device_type: str,
        brand_tier: str,
        damage_type: str,
        functional_status: str,
        original_price_inr: float,
        age_months: int,
        battery_health_pct: int,
        damage_severity: float,
    ) -> np.ndarray:
        cat_row = [[device_type, brand_tier, damage_type, functional_status]]
        cat_encoded = self.encoder.transform(cat_row)
        numeric = np.array([[original_price_inr, age_months, battery_health_pct, damage_severity]])
        return np.hstack([numeric, cat_encoded])

    def predict(
        self,
        device_type: str,
        brand_tier: str,
        damage_type: str,
        functional_status: str,
        original_price_inr: float,
        age_months: int,
        battery_health_pct: int,
        damage_severity: float,
    ) -> dict:
        X = self._build_feature_vector(
            device_type, brand_tier, damage_type, functional_status,
            original_price_inr, age_months, battery_health_pct, damage_severity,
        )

        recommendation = self.clf.predict(X)[0]
        proba = self.clf.predict_proba(X)[0]
        confidence = float(np.max(proba))

        repair_cost = float(self.repair_model.predict(X)[0])
        resale_value = float(self.resale_model.predict(X)[0])

        return {
            "recommendation": recommendation,
            "recommendation_confidence": round(confidence, 3),
            "estimated_repair_cost_inr": round(max(repair_cost, 0), 2),
            "estimated_resale_value_inr": round(max(resale_value, 0), 2),
        }


# Singleton, loaded once at startup
decision_engine = DecisionEngine()
