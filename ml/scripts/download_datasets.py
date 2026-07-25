"""
Download and organize damage-detection datasets from Roboflow Universe.

Setup:
    pip install roboflow python-dotenv
    Create ml/scripts/.env containing: ROBOFLOW_API_KEY=your_key_here

Usage:
    python download_datasets.py

This pulls each dataset in YOLOv8 format into ml/datasets/<category>/<project>/
Note: exact project slugs on Roboflow Universe can change over time -- if a
whole project isn't found (workspace/slug wrong), search
https://universe.roboflow.com for the dataset name and update DATASETS below.
Version numbers are auto-detected (latest available), so those don't need
manual upkeep.
"""

import os
from pathlib import Path


def sanitize_env_file(path: Path) -> dict[str, str]:
    """
    Reads a .env file tolerant of whatever encoding it was saved with, and
    rewrites it to disk as clean UTF-8. Windows tools (PowerShell '>'
    redirection, some Notepad saves) often write UTF-16 or add a BOM instead
    of plain UTF-8. This matters because the `roboflow` package itself calls
    python-dotenv's load_dotenv() internally the moment it's imported below
    -- so the file on disk must already be valid UTF-8 *before* that import
    happens, or roboflow's own internal call crashes with the same
    UnicodeDecodeError, regardless of anything this script does afterward.
    """
    values: dict[str, str] = {}
    if not path.exists():
        return values

    raw = path.read_bytes()
    text = None
    for encoding in ("utf-8-sig", "utf-8", "utf-16", "utf-16-le", "cp1252"):
        try:
            text = raw.decode(encoding)
            break
        except UnicodeDecodeError:
            continue

    if text is None:
        raise SystemExit(
            f"Could not read {path} with any known encoding. "
            "Re-save it as plain UTF-8."
        )

    for line in text.splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key:
            values[key] = value
            os.environ[key] = value

    clean_text = "\n".join(f"{k}={v}" for k, v in values.items()) + "\n"
    path.write_text(clean_text, encoding="utf-8")
    return values


sanitize_env_file(Path(__file__).resolve().parent / ".env")

from roboflow import Roboflow  # noqa: E402

API_KEY = os.getenv("ROBOFLOW_API_KEY")
if not API_KEY:
    raise SystemExit(
        "Missing ROBOFLOW_API_KEY. Create ml/scripts/.env with "
        "ROBOFLOW_API_KEY=your_free_roboflow_key"
    )

BASE_DIR = Path(__file__).resolve().parents[1] / "datasets"

# (category, workspace, project) -- no version number needed anymore,
# the script below finds the latest version automatically.
DATASETS = [
    ("phones", "abhinavpoc", "mobile-damage-diagnosis"),
    ("phones", "abhinavpoc", "cracked-screen"),
    ("laptops", "team-ks", "broken-laptop-parts"),
    ("laptops", "aanish-usman", "laptop-screen-damage-detection"),
    ("monitors", "public-workspace-eocvi", "screen-damage-buzm4"),
]


def latest_version_number(project) -> int:
    """Ask Roboflow which versions actually exist and return the highest one."""
    version_objs = project.versions()
    if not version_objs:
        raise RuntimeError("Project has no published versions.")
    # each version's `.id` looks like "workspace/project/N" -- pull N out
    numbers = [int(v.id.split("/")[-1]) for v in version_objs]
    return max(numbers)


def main():
    rf = Roboflow(api_key=API_KEY)
    for category, workspace, project_slug in DATASETS:
        out_dir = BASE_DIR / category / project_slug
        out_dir.mkdir(parents=True, exist_ok=True)
        print(f"Downloading {workspace}/{project_slug} -> {out_dir}")
        try:
            project = rf.workspace(workspace).project(project_slug)
            version = latest_version_number(project)
            print(f"  latest version found: v{version}")
            dataset = project.version(version).download(
                "yolov8", location=str(out_dir)
            )
            print(f"  done: {dataset.location}")
        except Exception as e:
            print(f"  FAILED ({e}). Check the project slug on Roboflow Universe.")


if __name__ == "__main__":
    main()