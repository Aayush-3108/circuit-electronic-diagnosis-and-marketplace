"""
Damage detection, in priority order:

  1. Local ONNX model (ultra-lightweight, ~100MB RAM, optimized for cloud & free-tier hosting).
  2. Local PyTorch YOLOv8 weights (if ultralytics is installed and .pt file is present).
  3. Roboflow hosted inference endpoint (if ROBOFLOW_MODEL_ENDPOINT is set).
  4. Mock fallback, clearly labeled, so the rest of the pipeline stays testable.

The model classes match Circuit's unified schema:
(screen_crack, screen_scratch, dead_pixel, body_damage, keyboard_damage, none).
"""

import base64
import io
import random
from pathlib import Path
from typing import Optional

import numpy as np
from PIL import Image
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

CLASS_NAMES = {
    0: "screen_crack",
    1: "screen_scratch",
    2: "dead_pixel",
    3: "body_damage",
    4: "keyboard_damage",
    5: "none",
}

MOCK_CLASSES = ["none", "screen_crack", "screen_scratch", "dead_pixel", "body_damage"]

_onnx_session = None
_onnx_load_attempted = False
_pt_model = None
_pt_load_attempted = False


def _get_onnx_session():
    global _onnx_session, _onnx_load_attempted
    if _onnx_load_attempted:
        return _onnx_session
    _onnx_load_attempted = True

    configured_path = Path(settings.yolo_local_weights_path)
    onnx_path = (
        configured_path
        if configured_path.suffix == ".onnx"
        else configured_path.with_suffix(".onnx")
    )

    if not onnx_path.exists():
        # Also check relative to backend models directory
        alt_path = Path(__file__).resolve().parents[1] / "models" / "yolo_damage_detector.onnx"
        if alt_path.exists():
            onnx_path = alt_path
        else:
            return None

    try:
        import onnxruntime as ort

        # Thread options set to 1 for minimal memory and CPU contention on single-core instances
        opts = ort.SessionOptions()
        opts.intra_op_num_threads = 1
        opts.inter_op_num_threads = 1
        _onnx_session = ort.InferenceSession(
            str(onnx_path), sess_options=opts, providers=["CPUExecutionProvider"]
        )
        print(f"[vision_service] Loaded ONNX model from {onnx_path} (ultra-low memory mode)")
    except Exception as e:
        print(f"[vision_service] Failed to load ONNX model: {e}")
        _onnx_session = None

    return _onnx_session


def _run_onnx_model(image_bytes: bytes) -> Optional[DamageDetection]:
    session = _get_onnx_session()
    if session is None:
        return None

    try:
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        image_resized = image.resize((640, 640))
        arr = np.array(image_resized, dtype=np.float32) / 255.0
        arr = np.transpose(arr, (2, 0, 1))
        arr = np.expand_dims(arr, axis=0)

        input_name = session.get_inputs()[0].name
        output = session.run(None, {input_name: arr})[0]

        # Output shape is (1, 10, 8400): 4 bbox coords + 6 class probabilities
        boxes_and_scores = output[0]
        scores = boxes_and_scores[4:, :]  # shape: (6, 8400)
        max_scores = np.max(scores, axis=0)  # max score for each anchor box
        best_idx = int(np.argmax(max_scores))
        best_score = float(max_scores[best_idx])

        if best_score < settings.yolo_confidence_threshold:
            return DamageDetection(
                damage_type="none",
                damage_severity=0.0,
                confidence=0.9,
                source="yolo_local",
            )

        class_idx = int(np.argmax(scores[:, best_idx]))
        raw_class_name = CLASS_NAMES.get(class_idx, "body_damage")
        mapped_class = CLASS_MAP.get(raw_class_name.lower(), raw_class_name)
        severity = round(min(best_score * 1.1, 1.0), 2)

        return DamageDetection(
            damage_type=mapped_class,
            damage_severity=severity,
            confidence=round(best_score, 3),
            source="yolo_local",
        )
    except Exception as e:
        print(f"[vision_service] ONNX inference error: {e}")
        return None


def _get_pt_model():
    global _pt_model, _pt_load_attempted
    if _pt_load_attempted:
        return _pt_model
    _pt_load_attempted = True

    configured_path = Path(settings.yolo_local_weights_path)
    pt_path = (
        configured_path
        if configured_path.suffix == ".pt"
        else configured_path.with_suffix(".pt")
    )

    if not pt_path.exists():
        alt_path = Path(__file__).resolve().parents[1] / "models" / "yolo_damage_detector.pt"
        if alt_path.exists():
            pt_path = alt_path
        else:
            return None

    try:
        from ultralytics import YOLO

        _pt_model = YOLO(str(pt_path))
        print(f"[vision_service] Loaded local PyTorch YOLO weights from {pt_path}")
    except Exception as e:
        print(f"[vision_service] Failed to load PyTorch YOLO weights: {e}")
        _pt_model = None

    return _pt_model


def _run_pt_model(image_bytes: bytes) -> Optional[DamageDetection]:
    model = _get_pt_model()
    if model is None:
        return None

    try:
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        results = model.predict(
            image, conf=settings.yolo_confidence_threshold, verbose=False
        )
        result = results[0]

        if result.boxes is None or len(result.boxes) == 0:
            return DamageDetection(
                damage_type="none", damage_severity=0.0, confidence=0.9, source="yolo_local"
            )

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
    except Exception as e:
        print(f"[vision_service] PyTorch inference error: {e}")
        return None


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
    # 1. Try ONNX runtime first (ultra-low memory, ~100MB RAM, safe for Render free tier)
    onnx_res = _run_onnx_model(image_bytes)
    if onnx_res is not None:
        return onnx_res

    # 2. Try PyTorch YOLO if available
    pt_res = _run_pt_model(image_bytes)
    if pt_res is not None:
        return pt_res

    # 3. Try Roboflow hosted API
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

    # 4. Fallback mock
    mock_type = random.choice(MOCK_CLASSES)
    mock_severity = 0.0 if mock_type == "none" else round(random.uniform(0.2, 0.9), 2)
    return DamageDetection(
        damage_type=mock_type,
        damage_severity=mock_severity,
        confidence=0.5,
        source="mock_fallback",
    )
