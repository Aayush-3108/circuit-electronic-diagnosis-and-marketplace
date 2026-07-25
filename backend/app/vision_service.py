"""
Damage detection, in priority order:

  1. Local YOLOv8 weights (ml/scripts/train_yolo.py --copy-to-backend output,
     at settings.yolo_local_weights_path). No API calls, no per-request cost,
     works fully offline once trained.
  2. Roboflow hosted inference endpoint (if ROBOFLOW_MODEL_ENDPOINT is set
     and no local weights are present).
  3. Mock fallback, clearly labeled, so the rest of the pipeline (decision
     models, recommendation, cost estimates) stays testable end-to-end even
     before a CV model exists.

The local model's class names already match Circuit's unified schema
(screen_crack, screen_scratch, dead_pixel, body_damage, keyboard_damage,
none) because merge_datasets.py remapped them at training-data prep time.
CLASS_MAP below only matters for the Roboflow hosted-endpoint path, where
raw Roboflow class names may not have gone through that remap step.
"""

import base64
import io
import random
from pathlib import Path
from typing import Optional

import requests

from app.config import settings
from app.schemas import DamageDetection

CLASS_MAP = {
    "screen_crack": "screen_crack",
    "cracked_screen": "screen_crack",
    "crack": "screen_crack",
    "screen_scratch": "screen_scratch",
    "scratch": "screen_scratch",
    "dead_pixel": "dead_pixel",
    "dead pixel scratch": "dead_pixel",
    "body_damage": "body_damage",
    "dent": "body_damage",
    "keyboard_damage": "keyboard_damage",
    "damaged": "body_damage",
    "good": "none",
}

MOCK_CLASSES = ["none", "screen_crack", "screen_scratch", "dead_pixel", "body_damage"]

# Lazy-loaded singleton so importing this module (and backend startup) stays
# fast even when local weights exist -- the actual model load + torch import
# only happens on the first real request that needs it.
_local_model = None
_local_model_load_attempted = False


def _get_local_model():
    global _local_model, _local_model_load_attempted
    if _local_model_load_attempted:
        return _local_model
    _local_model_load_attempted = True

    weights_path = Path(settings.yolo_local_weights_path)
    if not weights_path.exists():
        return None

    try:
        from ultralytics import YOLO  # deferred: torch import is heavy

        _local_model = YOLO(str(weights_path))
        print(f"[vision_service] Loaded local YOLO weights from {weights_path}")
    except Exception as e:
        print(f"[vision_service] Failed to load local YOLO weights: {e}")
        _local_model = None

    return _local_model


def _run_local_model(image_bytes: bytes) -> Optional[DamageDetection]:
    model = _get_local_model()
    if model is None:
        return None

    from PIL import Image

    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    results = model.predict(
        image, conf=settings.yolo_confidence_threshold, verbose=False
    )
    result = results[0]

    if result.boxes is None or len(result.boxes) == 0:
        return DamageDetection(
            damage_type="none", damage_severity=0.0, confidence=0.9, source="yolo_local"
        )

    # take the highest-confidence detected box as the primary damage finding
    best_idx = int(result.boxes.conf.argmax())
    class_idx = int(result.boxes.cls[best_idx])
    confidence = float(result.boxes.conf[best_idx])
    raw_class_name = result.names.get(class_idx, "body_damage")

    mapped_class = CLASS_MAP.get(raw_class_name.lower(), raw_class_name)
    severity = round(min(confidence * 1.1, 1.0), 2)

    return DamageDetection(
        damage_type=mapped_class,
        damage_severity=severity,
        confidence=round(confidence, 3),
        source="yolo_local",
    )


def _call_roboflow(image_bytes: bytes) -> dict | None:
    if not settings.roboflow_model_endpoint or not settings.roboflow_api_key:
        return None
    try:
        encoded = base64.b64encode(image_bytes).decode("utf-8")
        resp = requests.post(
            settings.roboflow_model_endpoint,
            params={"api_key": settings.roboflow_api_key},
            data=encoded,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            timeout=15,
        )
        resp.raise_for_status()
        return resp.json()
    except requests.RequestException:
        return None


def detect_damage(image_bytes: bytes) -> DamageDetection:
    local_result = _run_local_model(image_bytes)
    if local_result is not None:
        return local_result

    result = _call_roboflow(image_bytes)

    if result and result.get("predictions"):
        preds = result["predictions"]
        best = max(preds, key=lambda p: p.get("confidence", 0))
        mapped_class = CLASS_MAP.get(best.get("class", "").lower(), "body_damage")
        severity = round(min(best.get("confidence", 0.5) * 1.1, 1.0), 2)
        return DamageDetection(
            damage_type=mapped_class,
            damage_severity=severity,
            confidence=round(best.get("confidence", 0.5), 3),
            source="yolo_model",
        )

    if result and not result.get("predictions"):
        return DamageDetection(
            damage_type="none", damage_severity=0.0, confidence=0.9, source="yolo_model"
        )

    # Neither a local model nor a Roboflow endpoint is available: mock
    # fallback, clearly labeled so the frontend can show a "demo mode" badge
    # instead of presenting this as a real result.
    mock_type = random.choice(MOCK_CLASSES)
    mock_severity = 0.0 if mock_type == "none" else round(random.uniform(0.2, 0.9), 2)
    return DamageDetection(
        damage_type=mock_type,
        damage_severity=mock_severity,
        confidence=0.5,
        source="mock_fallback",
    )
