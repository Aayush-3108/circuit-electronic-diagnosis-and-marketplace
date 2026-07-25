"""
Train a YOLOv8 damage-detection model on the merged Circuit dataset.

Run this AFTER merge_datasets.py has produced ml/datasets/merged/data.yaml.

Usage:
    pip install ultralytics
    python train_yolo.py --epochs 50 --model yolov8n.pt

Notes:
- yolov8n.pt (nano) is the fastest, free-tier-friendly choice -- trains in
  minutes on Google Colab's free T4 GPU, or ~30-60 min on CPU for this
  dataset size. Use yolov8s.pt for a small accuracy bump if you have GPU time
  to spare.
- On Google Colab (recommended, free GPU):
    1. Upload ml/datasets/merged/ (zip it first, it's small) and this script
    2. Runtime -> Change runtime type -> GPU (T4)
    3. !pip install ultralytics
    4. !python train_yolo.py --epochs 50
    5. Download the resulting runs/detect/train/weights/best.pt
- Copy best.pt into backend/models/yolo_damage_detector.pt when done, or
  upload it to Roboflow (Deploy tab) to get a hosted inference endpoint you
  can drop straight into ROBOFLOW_MODEL_ENDPOINT in backend/.env.
"""

import argparse
from pathlib import Path

from ultralytics import YOLO

ROOT = Path(__file__).resolve().parents[1]
DATA_YAML = ROOT / "datasets" / "merged" / "data.yaml"
BACKEND_MODELS_DIR = ROOT.parent / "backend" / "models"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", default="yolov8n.pt", help="base checkpoint to fine-tune")
    parser.add_argument("--epochs", type=int, default=50)
    parser.add_argument("--imgsz", type=int, default=640)
    parser.add_argument("--batch", type=int, default=16)
    parser.add_argument("--data", default=str(DATA_YAML))
    parser.add_argument(
        "--copy-to-backend",
        action="store_true",
        help="copy the trained weights into backend/models/ when done",
    )
    args = parser.parse_args()

    data_path = Path(args.data)
    if not data_path.exists():
        raise SystemExit(
            f"Missing {data_path}. Run merge_datasets.py first (after downloading "
            "the source datasets listed in docs/DATASETS.md)."
        )

    print(f"Training YOLOv8 ({args.model}) on {data_path} for {args.epochs} epochs...")
    model = YOLO(args.model)
    results = model.train(
        data=str(data_path),
        epochs=args.epochs,
        imgsz=args.imgsz,
        batch=args.batch,
        device=0,      # explicit GPU (CUDA:0), falls back to CPU if unavailable
        amp=False,     # disable AMP — GTX 1650 has known FP16 NaN issues
        project=str(ROOT / "models" / "runs"),
        name="circuit_damage_yolov8",
        patience=15,   # early stop if val loss plateaus for 15 epochs
        cache="disk",  # disk-cache images — avoids RAM exhaustion
        workers=2,     # 2 workers is safe on GPU without starving it
        exist_ok=True, # reuse run dir if restarting
    )

    # Validate on the val split and print a quick summary
    metrics = model.val()
    print("\n=== Validation metrics ===")
    print(f"  mAP50:    {metrics.box.map50:.4f}")
    print(f"  mAP50-95: {metrics.box.map:.4f}")

    best_weights = Path(results.save_dir) / "weights" / "best.pt"
    print(f"\nBest weights saved at: {best_weights}")

    if args.copy_to_backend:
        import shutil

        BACKEND_MODELS_DIR.mkdir(parents=True, exist_ok=True)
        dest = BACKEND_MODELS_DIR / "yolo_damage_detector.pt"
        shutil.copy2(best_weights, dest)
        print(f"Copied to {dest}")
        print(
            "Note: backend/app/vision_service.py currently calls a Roboflow "
            "hosted endpoint. To serve this local .pt file instead, load it "
            "with `YOLO('backend/models/yolo_damage_detector.pt')` inside "
            "vision_service.py and swap the Roboflow HTTP call for a local "
            "model.predict() call."
        )


if __name__ == "__main__":
    main()
