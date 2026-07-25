"""
Merge the downloaded Roboflow YOLOv8 datasets (different class naming per
dataset) into one unified dataset under ml/datasets/merged/, with all class
names remapped to Circuit's shared schema:

    screen_crack, screen_scratch, dead_pixel, body_damage, keyboard_damage, none

Run this AFTER manually downloading + unzipping the 5 datasets into the
folders listed in docs/DATASETS.md (or after running download_datasets.py).

Usage:
    pip install pyyaml
    python merge_datasets.py

Expects each source dataset folder to contain the standard Roboflow YOLOv8
export layout:
    <dataset>/train/images/*.jpg, <dataset>/train/labels/*.txt
    <dataset>/valid/images/*.jpg, <dataset>/valid/labels/*.txt
    <dataset>/test/images/*.jpg,  <dataset>/test/labels/*.txt   (optional)
    <dataset>/data.yaml   (defines that dataset's own class index -> name)
"""

import shutil
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1] / "datasets"
MERGED_DIR = ROOT / "merged"

UNIFIED_CLASSES = [
    "screen_crack",
    "screen_scratch",
    "dead_pixel",
    "body_damage",
    "keyboard_damage",
    "none",
]
CLASS_TO_IDX = {name: i for i, name in enumerate(UNIFIED_CLASSES)}

# Ordered keyword -> unified class. First match wins, so put more specific
# keywords first (e.g. "lcd_crack" before generic "crack" if needed).
KEYWORD_MAP = [
    ("keyboard", "keyboard_damage"),
    ("lcd_broken", "screen_crack"),
    ("lcd_crack", "screen_crack"),
    ("body_crack", "body_damage"),
    ("body_scratch", "body_damage"),
    ("crack", "screen_crack"),
    ("scratch", "screen_scratch"),
    ("dead pixel", "dead_pixel"),
    ("pixel", "dead_pixel"),
    ("fade", "dead_pixel"),
    ("lcd_line", "dead_pixel"),
    ("line", "dead_pixel"),
    ("spot", "body_damage"),
    ("dent", "body_damage"),
    ("damaged", "body_damage"),
    ("body", "body_damage"),
    ("good", "none"),
    ("normal", "none"),
    ("none", "none"),
]

# Source datasets to merge: (relative path under ml/datasets/, label for logging)
SOURCE_DATASETS = [
    "phones/mobile-damage-diagnosis",
    "phones/cracked-screen",
    "laptops/broken-laptop-parts",
    "laptops/laptop-screen-damage-detection",
    "monitors/screen-damage-buzm4",
]

SPLITS = ["train", "valid", "test"]


def map_class_name(name: str) -> str | None:
    lname = name.lower().strip()
    for keyword, unified in KEYWORD_MAP:
        if keyword in lname:
            return unified
    return None  # unmapped class -> drop these annotations


def load_dataset_classes(dataset_dir: Path) -> dict[int, str]:
    yaml_path = dataset_dir / "data.yaml"
    if not yaml_path.exists():
        raise FileNotFoundError(f"No data.yaml found in {dataset_dir}")
    with open(yaml_path) as f:
        data = yaml.safe_load(f)
    names = data.get("names", [])
    if isinstance(names, dict):
        return {int(k): v for k, v in names.items()}
    return {i: n for i, n in enumerate(names)}


def remap_label_file(src_label_path: Path, class_map: dict[int, str]) -> list[str]:
    """Read a YOLO label file, remap class indices, return new lines (dropping unmapped classes)."""
    if not src_label_path.exists():
        return []
    new_lines = []
    for line in src_label_path.read_text().splitlines():
        parts = line.strip().split()
        if not parts:
            continue
        old_idx = int(parts[0])
        old_name = class_map.get(old_idx)
        if old_name is None:
            continue
        unified_name = map_class_name(old_name)
        if unified_name is None:
            continue  # skip classes we can't confidently map
        new_idx = CLASS_TO_IDX[unified_name]
        new_lines.append(" ".join([str(new_idx)] + parts[1:]))
    return new_lines


def merge_split(dataset_dir: Path, split: str, class_map: dict[int, str], counters: dict):
    images_dir = dataset_dir / split / "images"
    labels_dir = dataset_dir / split / "labels"
    if not images_dir.exists():
        return

    out_images = MERGED_DIR / split / "images"
    out_labels = MERGED_DIR / split / "labels"
    out_images.mkdir(parents=True, exist_ok=True)
    out_labels.mkdir(parents=True, exist_ok=True)

    prefix = dataset_dir.name  # avoid filename collisions across source datasets
    for img_path in images_dir.glob("*"):
        if img_path.suffix.lower() not in (".jpg", ".jpeg", ".png"):
            continue
        label_path = labels_dir / (img_path.stem + ".txt")
        new_lines = remap_label_file(label_path, class_map)
        if not new_lines:
            counters["skipped_no_valid_labels"] += 1
            continue

        new_name = f"{prefix}_{img_path.name}"
        shutil.copy2(img_path, out_images / new_name)
        (out_labels / f"{prefix}_{img_path.stem}.txt").write_text("\n".join(new_lines) + "\n")
        counters["copied"] += 1


def main():
    counters = {"copied": 0, "skipped_no_valid_labels": 0, "missing_datasets": 0}

    for rel_path in SOURCE_DATASETS:
        dataset_dir = ROOT / rel_path
        if not dataset_dir.exists() or not (dataset_dir / "data.yaml").exists():
            print(f"SKIP (not found): {dataset_dir}  -- did you download + unzip it?")
            counters["missing_datasets"] += 1
            continue

        print(f"Merging {rel_path} ...")
        class_map = load_dataset_classes(dataset_dir)
        for split in SPLITS:
            merge_split(dataset_dir, split, class_map, counters)

    # Write merged data.yaml for YOLOv8 training
    merged_yaml = {
        "path": str(MERGED_DIR),
        "train": "train/images",
        "val": "valid/images",
        "test": "test/images",
        "nc": len(UNIFIED_CLASSES),
        "names": UNIFIED_CLASSES,
    }
    MERGED_DIR.mkdir(parents=True, exist_ok=True)
    with open(MERGED_DIR / "data.yaml", "w") as f:
        yaml.safe_dump(merged_yaml, f, sort_keys=False)

    print("\nDone.")
    print(f"  Images copied: {counters['copied']}")
    print(f"  Images skipped (no mappable labels): {counters['skipped_no_valid_labels']}")
    print(f"  Source datasets missing: {counters['missing_datasets']}")
    print(f"  Merged dataset + data.yaml written to: {MERGED_DIR}")
    if counters["missing_datasets"] > 0:
        print(
            "\nSome datasets were missing -- download them from the links in "
            "docs/DATASETS.md and re-run this script (it's safe to re-run)."
        )


if __name__ == "__main__":
    main()
