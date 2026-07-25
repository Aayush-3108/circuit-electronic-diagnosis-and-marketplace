"""
Train the Circuit decision engine models:
  1. RandomForestClassifier  -> recommendation (sell / repair / recycle / upgrade)
  2. XGBoost Regressor       -> estimated_repair_cost_inr
  3. LightGBM Regressor      -> estimated_resale_value_inr

Input:  data/synthetic_devices.csv  (see generate_synthetic_data.py)
Output: backend/models/*.joblib + ml/models/training_report.json

Usage:
    pip install -r requirements.txt
    python train_models.py
"""

import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from lightgbm import LGBMRegressor
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    mean_absolute_error,
    r2_score,
)
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OneHotEncoder
from xgboost import XGBRegressor

ROOT = Path(__file__).resolve().parents[2]
DATA_PATH = ROOT / "data" / "synthetic_devices.csv"
BACKEND_MODELS_DIR = ROOT / "backend" / "models"
REPORT_PATH = ROOT / "ml" / "models" / "training_report.json"

CATEGORICAL_COLS = ["device_type", "brand_tier", "damage_type", "functional_status"]
NUMERIC_COLS = ["original_price_inr", "age_months", "battery_health_pct", "damage_severity"]

RANDOM_STATE = 42


def load_and_encode(df: pd.DataFrame):
    """One-hot encode categoricals, return feature matrix + fitted encoder."""
    encoder = OneHotEncoder(handle_unknown="ignore", sparse_output=False)
    cat_encoded = encoder.fit_transform(df[CATEGORICAL_COLS])
    cat_feature_names = encoder.get_feature_names_out(CATEGORICAL_COLS)

    X = np.hstack([df[NUMERIC_COLS].values, cat_encoded])
    feature_names = NUMERIC_COLS + list(cat_feature_names)
    return X, feature_names, encoder


def train_classifier(X, y, feature_names):
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=RANDOM_STATE, stratify=y
    )
    clf = RandomForestClassifier(
        n_estimators=300,
        max_depth=12,
        min_samples_leaf=5,
        random_state=RANDOM_STATE,
        class_weight="balanced",
    )
    clf.fit(X_train, y_train)
    preds = clf.predict(X_test)

    acc = accuracy_score(y_test, preds)
    report = classification_report(y_test, preds, output_dict=True)

    importances = sorted(
        zip(feature_names, clf.feature_importances_), key=lambda x: -x[1]
    )[:10]

    return clf, {
        "accuracy": round(acc, 4),
        "classification_report": report,
        "top_features": [(name, round(float(imp), 4)) for name, imp in importances],
    }


def train_regressor(model, X, y, name):
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=RANDOM_STATE
    )
    model.fit(X_train, y_train)
    preds = model.predict(X_test)

    mae = mean_absolute_error(y_test, preds)
    r2 = r2_score(y_test, preds)
    mape = float(np.mean(np.abs((y_test - preds) / np.clip(y_test, 1, None))) * 100)

    return model, {
        "model": name,
        "mae_inr": round(float(mae), 2),
        "r2_score": round(float(r2), 4),
        "mape_pct": round(mape, 2),
    }


def main():
    if not DATA_PATH.exists():
        raise SystemExit(
            f"Missing {DATA_PATH}. Run generate_synthetic_data.py first."
        )

    BACKEND_MODELS_DIR.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)

    df = pd.read_csv(DATA_PATH)
    X, feature_names, encoder = load_and_encode(df)

    report = {}

    # 1. Classifier: recommendation
    print("Training RandomForest classifier (recommendation)...")
    clf, clf_report = train_classifier(X, df["recommendation"].values, feature_names)
    report["recommendation_classifier"] = clf_report
    print(f"  accuracy: {clf_report['accuracy']}")

    # 2. Regressor: repair cost (XGBoost)
    print("Training XGBoost regressor (repair cost)...")
    xgb_model = XGBRegressor(
        n_estimators=400,
        max_depth=6,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=RANDOM_STATE,
    )
    xgb_model, xgb_report = train_regressor(
        xgb_model, X, df["estimated_repair_cost_inr"].values, "xgboost_repair_cost"
    )
    report["repair_cost_regressor"] = xgb_report
    print(f"  MAE: Rs.{xgb_report['mae_inr']}  R2: {xgb_report['r2_score']}")

    # 3. Regressor: resale value (LightGBM)
    print("Training LightGBM regressor (resale value)...")
    lgbm_model = LGBMRegressor(
        n_estimators=400,
        max_depth=8,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=RANDOM_STATE,
        verbose=-1,
    )
    lgbm_model, lgbm_report = train_regressor(
        lgbm_model, X, df["estimated_resale_value_inr"].values, "lightgbm_resale_value"
    )
    report["resale_value_regressor"] = lgbm_report
    print(f"  MAE: Rs.{lgbm_report['mae_inr']}  R2: {lgbm_report['r2_score']}")

    # Save models + encoder + feature schema
    joblib.dump(clf, BACKEND_MODELS_DIR / "recommendation_classifier.joblib")
    joblib.dump(xgb_model, BACKEND_MODELS_DIR / "repair_cost_regressor.joblib")
    joblib.dump(lgbm_model, BACKEND_MODELS_DIR / "resale_value_regressor.joblib")
    joblib.dump(encoder, BACKEND_MODELS_DIR / "categorical_encoder.joblib")
    joblib.dump(
        {"numeric_cols": NUMERIC_COLS, "categorical_cols": CATEGORICAL_COLS},
        BACKEND_MODELS_DIR / "feature_schema.joblib",
    )

    with open(REPORT_PATH, "w") as f:
        json.dump(report, f, indent=2)

    print(f"\nModels saved to {BACKEND_MODELS_DIR}")
    print(f"Training report saved to {REPORT_PATH}")


if __name__ == "__main__":
    main()
