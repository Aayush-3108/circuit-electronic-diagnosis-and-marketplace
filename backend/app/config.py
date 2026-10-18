"""
Central config, loaded from environment variables / .env file.
Copy backend/.env.example to backend/.env and fill in your free-tier keys.
"""

from typing import Any
from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Roboflow (YOLOv8 damage detection - hosted inference, used only if
    # yolo_local_weights_path below isn't set / the file doesn't exist)
    roboflow_api_key: str = ""
    roboflow_model_endpoint: str = ""  # e.g. "https://detect.roboflow.com/circuit-damage/1"

    # Local YOLOv8 weights (from ml/scripts/train_yolo.py --copy-to-backend).
    # If this file exists, it's used instead of the Roboflow hosted endpoint
    # -- no per-call API cost, no external dependency at inference time.
    yolo_local_weights_path: str = "models/yolo_damage_detector.onnx"
    yolo_confidence_threshold: float = 0.35

    # Upgrade Advisor (Google Gemini) - free tier
    gemini_api_key: str = ""
    gemini_model: str = "gemini-flash-lite-latest"

    # Groq (chatbot) - free tier, OpenAI-compatible API
    groq_api_key: str = ""
    groq_model: str = "openai/gpt-oss-20b"

    # Firebase (auth token verification) - service account JSON path
    firebase_credentials_path: str = ""

    # CORS — add any extra origins as a comma-separated env var ALLOWED_ORIGINS
    allowed_origins: list[str] | str = [
        "http://localhost:5173",
        "http://localhost:3000",
        "https://circuit-electronic-diagnosis-and-ma.vercel.app",
    ]

    # Fraud and Anomaly Detection (Isolation Forest)
    fraud_model_path: str = "models/isolation_forest_fraud.joblib"
    fraud_feature_schema_path: str = "models/fraud_feature_schema.joblib"
    fraud_contamination: float = 0.05
    fraud_model_version: str = "isolation_forest_v1.0"

    # Admin emails with access to the fraud monitoring portal
    admin_emails: list[str] | str = [
        "admin@recircuit.com",
        "admin@circuit.com",
        "csdeshmukh3108@gmail.com",
    ]

    # Authentication Rate Limiting
    auth_rate_limit_max_attempts: int = 5
    auth_rate_limit_window_minutes: int = 10
    auth_rate_limit_cooldown_minutes: int = 15

    @field_validator("allowed_origins", "admin_emails", mode="after")
    @classmethod
    def parse_comma_separated_list(cls, v: Any) -> list[str]:
        if isinstance(v, str):
            v = v.strip()
            if v.startswith("[") and v.endswith("]"):
                import json
                try:
                    return json.loads(v)
                except Exception:
                    pass
            return [item.strip().lower() for item in v.split(",") if item.strip()]
        if isinstance(v, list):
            return [item.lower() if isinstance(item, str) else str(item) for item in v]
        return v

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


settings = Settings()

