"""
Central config, loaded from environment variables / .env file.
Copy backend/.env.example to backend/.env and fill in your free-tier keys.
"""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Roboflow (YOLOv8 damage detection - hosted inference, used only if
    # yolo_local_weights_path below isn't set / the file doesn't exist)
    roboflow_api_key: str = ""
    roboflow_model_endpoint: str = ""  # e.g. "https://detect.roboflow.com/circuit-damage/1"

    # Local YOLOv8 weights (from ml/scripts/train_yolo.py --copy-to-backend).
    # If this file exists, it's used instead of the Roboflow hosted endpoint
    # -- no per-call API cost, no external dependency at inference time.
    yolo_local_weights_path: str = "models/yolo_damage_detector.pt"
    yolo_confidence_threshold: float = 0.35

    # Upgrade Advisor (Google Gemini) - free tier
    gemini_api_key: str = ""
    gemini_model: str = "gemini-1.5-flash"

    # Groq (chatbot) - free tier, OpenAI-compatible API
    groq_api_key: str = ""
    groq_model: str = "llama-3.3-70b-versatile"

    # Firebase (auth token verification) - service account JSON path
    firebase_credentials_path: str = ""

    # CORS
    allowed_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
