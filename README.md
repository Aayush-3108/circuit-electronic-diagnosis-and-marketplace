
# Circuit — AI-Powered Electronics Marketplace 

Post a photo of a damaged device → get an AI-driven sell / repair / recycle
recommendation, nearby repair shop suggestions, and an upgrade advisor.

## Stack (all free tier)
- **Frontend:** React
- **Backend:** FastAPI (Python)
- **Auth/DB:** Firebase (free Spark plan)
- **CV model:** YOLOv8 (Ultralytics, open-source) trained on Roboflow Universe datasets
- **Decision models:** XGBoost / LightGBM (regression on repair cost/resale value),
  Random Forest (sell/repair/recycle classification)
- **CV hosting:** Roboflow (free inference API tier) or self-hosted via FastAPI
- **Upgrade advisor:** Google Gemini API (free tier)
- **Nearby repair shops:** Google Places API (free tier / OpenStreetMap Nominatim as no-cost fallback)

## Repo structure
```
circuit-marketplace/
├── frontend/           # React app (landing page, dashboard, upload flow)
├── backend/
│   ├── app/             # FastAPI routes, model-serving logic
│   └── models/          # Serialized trained models (.pkl, .pt)
├── ml/
│   ├── datasets/         # Downloaded Roboflow datasets, by device category
│   ├── notebooks/        # Training/EDA notebooks
│   ├── models/           # Training scripts output
│   └── scripts/          # download_datasets.py, synthetic data gen, training scripts
├── data/                # Synthetic tabular data (device age, specs, condition -> outcome)
└── docs/                # DATASETS.md, architecture notes, report material
```

## Build order (see docs/DATASETS.md for dataset details)
1. ✅ Repo scaffold
2. ⬜ Download + merge Roboflow damage-detection datasets (`ml/scripts/download_datasets.py`)
3. ⬜ Generate synthetic tabular dataset (device specs + condition → sell/repair/recycle label)
4. ⬜ Train YOLOv8 on merged image dataset
5. ⬜ Train XGBoost/LightGBM regressor (estimated resale/repair cost) + Random Forest classifier (decision)
6. ⬜ FastAPI backend wrapping both models + Gemini + Places API
7. ⬜ Firebase auth integration
8. ⬜ React frontend (landing, upload, dashboard, results, upgrade advisor)
9. ⬜ End-to-end integration + demo polish

## Known scope decisions (documented for the report)
- No dedicated tablet-damage dataset exists publicly — tablets share the phone/
  laptop-screen model with a documented limitation.
- PC/desktop tower damage is assessed via a structured questionnaire rather than
  image detection (no reliable public dataset for chassis damage), keeping the
  scope realistic for a ₹0 college capstone.
=======

