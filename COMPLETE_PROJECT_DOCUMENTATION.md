# COMPLETE TECHNICAL DOCUMENTATION
# Circuit — AI-Powered Electronics Diagnosis & Marketplace
# ============================================================
# Generated: 2026-08-06 | Author: Aayush-3108
# Repository: https://github.com/Aayush-3108/circuit-electronic-diagnosis-and-marketplace

---

## TABLE OF CONTENTS

1.  Executive Summary
2.  Complete Folder Structure
3.  Every File Explained
4.  Technology Stack
5.  Dependency Analysis
6.  Architecture
7.  Frontend
8.  Backend
9.  Database
10. APIs
11. AI / Machine Learning
12. Algorithms
13. Functions
14. Classes
15. Data Flow
16. Authentication
17. Environment Variables
18. Configuration Files
19. Design Patterns
20. External Services
21. Security
22. Performance
23. Error Handling
24. Code Flow (Startup to Usable)
25. Complete Call Graph
26. File Dependency Graph
27. Sequence Diagrams
28. Known Limitations
29. Improvement Suggestions
30. Glossary
31. Beginner's Guide
32. Interview Preparation
33. Project Recreation Guide
34. Source Code References
35. Final Project Summary

---

# 1. EXECUTIVE SUMMARY

## What This Project Is
Circuit is a full-stack, AI-powered web application for diagnosing damaged consumer electronics
(phones, laptops, tablets, PCs, monitors) and providing data-driven sell/repair/recycle/upgrade
recommendations. It also provides a built-in peer-to-peer marketplace where users can buy and sell
individual components or whole damaged devices.

## What Problem It Solves
E-waste is a global crisis. Most consumers throw away repairable or salvageable electronics because
they do not know:
  1. Whether a repair is economically worthwhile
  2. What the device is worth as-is on the second-hand market
  3. Where the nearest repair shop is
  4. Whether another user's broken device has the part they need

Circuit solves all four with AI.

## Target Users
- College students on tight budgets with a cracked phone or aging laptop
- Home users making sell/repair/scrap decisions on electronics
- Repair shop ecosystem (sellers of parts, buyers looking for donors)
- E-waste reduction advocates

## Main Features
1. AI Damage Detection — YOLOv8 classifies damage from a device photo
2. Sell/Repair/Recycle/Upgrade Recommendation — RandomForest with 87.5% accuracy
3. Estimated Repair Cost (XGBoost) and Resale Value (LightGBM) in INR
4. Part-Matching / Donor Device Finder — cross-user compatibility matching
5. Peer-to-Peer Marketplace — whole devices or individual parts
6. Fraud Detection — Isolation Forest flags anomalous listings
7. Demand Forecasting — Prophet/mock model shows trending parts
8. Nearby Repair Shops — OpenStreetMap Overpass (no API key required)
9. Upgrade Advisor — Google Gemini-powered AI advisor
10. AI Chatbot — floating Groq LLaMA chatbot on every page
11. Firebase Auth — email/password with graceful demo-mode fallback

## Overall Architecture

  [User Browser]
        |
        v
  [React (Vite) SPA] -------> [Cloudinary CDN] (listing images)
        |                      [Firebase Auth]  (ID tokens)
        | REST HTTP + Bearer JWT
        v
  [FastAPI Python Server (Uvicorn) — port 8000]
        |-- Vision Service   -> Local YOLOv8 / Roboflow / Mock
        |-- Decision Engine  -> RandomForest + XGBoost + LightGBM (.joblib)
        |-- Fraud Detector   -> Isolation Forest (.pkl)
        |-- Forecasting      -> Prophet / mock (.pkl)
        |-- Part Matching    -> Rule engine + live marketplace query
        |-- Chatbot          -> Groq API (LLaMA 3.3 70B)
        |-- Upgrade Advisor  -> Google Gemini API
        |-- Repair Shops     -> OpenStreetMap Overpass + Nominatim + Fallback
        |-- History          -> Firebase Firestore / in-memory
        `-- Marketplace      -> Firebase Firestore / SQLite (local fallback)

---

# 2. COMPLETE FOLDER STRUCTURE

circuit-electronic-diagnosis-and-marketplace/
|
|-- .git/                         # Git version control (auto-generated, never edit)
|-- .venv/                        # Python virtual environment (gitignored)
|-- .gitignore                    # Excludes secrets, cache, node_modules from git
|-- README.md                     # High-level project overview
|-- implementation_status.md      # Living feature completion tracker
|-- COMPLETE_PROJECT_DOCUMENTATION.md   # This document
|
|-- backend/                      # FastAPI Python server
|   |-- .env                      # Secret config (GITIGNORED — never commit)
|   |-- .env.example              # Template of all env variables with comments
|   |-- requirements.txt          # Python pip dependencies
|   |-- data/
|   |   `-- marketplace.db        # SQLite DB for listings (auto-created as fallback)
|   |-- models/                   # Trained ML artifacts loaded at inference time
|   |   |-- recommendation_classifier.joblib   # RandomForest (sell/repair/recycle/upgrade)
|   |   |-- repair_cost_regressor.joblib       # XGBoost (INR repair cost)
|   |   |-- resale_value_regressor.joblib      # LightGBM (INR resale value)
|   |   |-- categorical_encoder.joblib         # OneHotEncoder fitted on training data
|   |   `-- feature_schema.joblib              # Column name schema for feature vectors
|   `-- app/                      # All FastAPI application source
|       |-- __init__.py            # Makes app/ a Python package
|       |-- main.py                # FastAPI app factory + ALL route definitions
|       |-- config.py              # Pydantic Settings from .env (singleton)
|       |-- schemas.py             # Pydantic request/response data models (API contract)
|       |-- auth_deps.py           # FastAPI Depends() auth helpers
|       |-- firebase_admin_client.py   # Firebase Admin SDK init + token verify
|       |-- vision_service.py      # Damage detection: YOLOv8 -> Roboflow -> Mock
|       |-- ml_service.py          # Decision Engine + FraudDetector
|       |-- marketplace_service.py # Marketplace CRUD (Firestore -> SQLite fallback)
|       |-- sqlite_store.py        # SQLite persistence layer
|       |-- history_service.py     # Per-user analysis history in Firestore
|       |-- chatbot.py             # Groq LLaMA chatbot integration
|       |-- upgrade_advisor.py     # Google Gemini upgrade advisor
|       |-- repair_shops.py        # OpenStreetMap repair shop finder
|       |-- forecasting_service.py # Demand forecast loader
|       `-- part_matching_service.py   # Rule-based compatibility engine
|
|-- frontend/                     # React + Vite SPA
|   |-- package.json              # Node.js project manifest + npm scripts
|   |-- vite.config.js            # Vite bundler config
|   |-- index.html                # HTML shell (SPA entry point)
|   |-- .env                      # Frontend secrets (VITE_ prefixed, gitignored)
|   `-- src/
|       |-- main.jsx              # React root — mounts App inside providers
|       |-- App.jsx               # Root component — view state machine (SPA routing)
|       |-- api.js                # Centralized API client (all fetch() calls)
|       |-- index.css             # Global design system (CSS vars, Tailwind, components)
|       |-- context/
|       |   |-- AuthContext.jsx   # Firebase auth state + demo mode
|       |   `-- ThemeContext.jsx  # Dark/light theme + localStorage persistence
|       |-- lib/
|       |   |-- firebase.js       # Firebase SDK initialization
|       |   `-- cloudinary.js     # Cloudinary image upload helper
|       `-- components/           # All UI components (16 files)
|           |-- Nav.jsx            # Sticky top navigation bar
|           |-- Hero.jsx           # Landing page hero with animated SVG
|           |-- AuthModal.jsx      # Login/signup modal dialog
|           |-- AnalyzeForm.jsx    # 3-step device analysis form
|           |-- ResultPanel.jsx    # Analysis result display + donor matches
|           |-- Dashboard.jsx      # User dashboard (history/listings/stats tabs)
|           |-- Marketplace.jsx    # Public listings browser
|           |-- ListingCard.jsx    # Compact listing card
|           |-- ListingDetail.jsx  # Full listing detail modal
|           |-- CreateListingForm.jsx  # Create listing form
|           |-- UpgradeAdvisor.jsx # Gemini upgrade advice UI
|           |-- RepairShopFinder.jsx   # Interactive Leaflet map + shops list
|           |-- ChatWidget.jsx     # Floating chatbot widget (app-wide)
|           |-- StatusChip.jsx     # Colored verdict badge
|           |-- StatusLegend.jsx   # Landing page verdict color legend
|           `-- TraceDivider.jsx   # Decorative PCB-trace SVG divider
|
|-- ml/                           # Machine Learning layer (training only)
|   |-- datasets/                 # Raw downloaded Roboflow/public datasets
|   |-- notebooks/                # Jupyter notebooks (EDA — currently empty)
|   |-- models/                   # Training artifacts + evaluation reports
|   |   |-- training_report.json  # Model accuracy/MAE/R2 metrics
|   |   |-- fraud_model.pkl       # Trained Isolation Forest
|   |   `-- demand_forecast_model.pkl  # Trained Prophet or mock model
|   `-- scripts/                  # All training scripts
|       |-- generate_synthetic_data.py   # Generates CSV with 8000 synthetic device records
|       |-- download_datasets.py         # Downloads Roboflow datasets
|       |-- merge_datasets.py            # Merges + normalizes datasets
|       |-- train_models.py             # Trains RF + XGBoost + LightGBM
|       |-- train_yolo.py               # Fine-tunes YOLOv8 on damage images
|       |-- train_fraud_detection.py    # Trains Isolation Forest
|       |-- train_demand_forecast.py    # Trains Prophet for demand forecasting
|       `-- yolov8n.pt                  # Pre-trained YOLOv8 nano base weights
|
|-- data/
|   `-- synthetic_devices.csv     # Generated CSV (device specs + labels) — training input
|
|-- docs/                         # Documentation files (mostly empty)
`-- runs/                         # YOLO training run outputs

---

# 3. EVERY FILE EXPLAINED

=== BACKEND ===

backend/requirements.txt
  Purpose: Declares all Python packages the backend needs.
  Key packages: fastapi, uvicorn, pydantic-settings, joblib, scikit-learn=1.8.0,
                xgboost, lightgbm, firebase-admin, ultralytics, Pillow, requests
  Used by: pip install -r requirements.txt during environment setup.
  Essential: YES.

backend/.env.example
  Purpose: Template showing all required environment variables with documentation.
  Contains: Keys for Roboflow, Gemini, Groq, Firebase, CORS config.
  Never executed. Copy to .env and fill in real values.
  Essential: For onboarding new developers.

backend/app/__init__.py
  Purpose: Makes app/ a Python package (required for relative imports like from app.config import settings).
  Contents: Empty file.
  Essential: YES.

backend/app/main.py
  Purpose: FastAPI application factory. Creates the app instance, adds CORS middleware,
           and defines ALL API routes (13 routes total).
  Key imports: FastAPI, CORSMiddleware, all service modules, schemas.
  Exports: app (the FastAPI instance consumed by uvicorn).
  Routes: /api/health, /api/analyze-device, /api/upgrade-advice, /api/repair-shops,
          /api/demand-forecast, /api/chat, /api/history,
          /api/marketplace/listings (CRUD), /api/marketplace/matches
  Execution: uvicorn imports this module -> FastAPI() runs -> middleware added ->
             routes registered -> server begins accepting requests.
  Essential: YES — the application entry point.

backend/app/config.py
  Purpose: Centralized configuration singleton. Uses pydantic_settings.BaseSettings
           to automatically read environment variables from .env.
  Class: Settings (one global instance `settings = Settings()`)
  Fields: roboflow_api_key, roboflow_model_endpoint, yolo_local_weights_path (default:
          models/yolo_damage_detector.pt), yolo_confidence_threshold (0.35),
          gemini_api_key, gemini_model (gemini-1.5-flash), groq_api_key,
          groq_model (llama-3.3-70b-versatile), firebase_credentials_path,
          allowed_origins (list[str])
  Called by: All backend service modules that need configuration.
  Essential: YES.

backend/app/schemas.py
  Purpose: Pydantic data models — the API contract between frontend and backend.
           All request bodies are validated against these; all responses are serialized.
  Key types:
    DeviceType — Literal union: phone/laptop/tablet/pc/monitor
    BrandTier — budget/mid/premium
    FunctionalStatus — fully_functional/partially_functional/not_functional
    DamageType — Literal union of all damage categories
    Recommendation — sell/repair/recycle/upgrade
    DamageDetection — CV model output: damage_type, severity, confidence, source
    AnalyzeResponse — Full analyze endpoint response
    UpgradeAdviceRequest/Response — Upgrade advisor models
    RepairShop — Shop info schema
    ChatMessage/Request/Response — Chatbot schemas
    HistoryEntry — User history item
    PartListing — Individual part in a listing
    ListingCreateRequest — New listing creation payload
    MarketplaceListing — Full listing record
    ListingStatusUpdateRequest — Status update payload
  Essential: YES.

backend/app/auth_deps.py
  Purpose: FastAPI dependency injection for authentication. Provides two flavors.
  Functions:
    _extract_token(authorization) -> str|None
      Strips "Bearer " prefix from Authorization header.
    get_optional_user(authorization) -> dict|None
      Returns user dict or None. Never raises. Used on routes that work for everyone
      but personalize/save data when signed in (e.g. /api/analyze-device).
    require_user(authorization) -> dict
      Raises HTTP 401 if not authenticated. Used on routes that require sign-in
      (history, listing management).
  Called by: Route decorators in main.py via Depends().
  Essential: YES.

backend/app/firebase_admin_client.py
  Purpose: Initializes Firebase Admin SDK and provides token verification + Firestore
           client. Degrades gracefully when no service account is configured.
  Global state: _app, _db, _init_error, _init_sdk_failed
  Key functions:
    _init() — Lazy init. Reads credentials JSON, initializes SDK or logs warning.
    firebase_configured() -> bool
    firebase_status() -> dict — Used by /api/health
    _decode_unverified_token(id_token) -> dict|None
      Fallback JWT base64 decoder for demo mode (no cryptographic verification).
    verify_token(id_token) -> dict|None
      Primary verification. Falls back to unverified decode if SDK not initialized.
    get_firestore() -> db|None
  Important behavior: If Firebase not configured, returns None (treated as anonymous)
                      instead of raising — API keeps working in demo mode.
  Essential: YES (for auth + persistence).

backend/app/vision_service.py
  Purpose: Damage detection pipeline with 3-tier fallback.
  Class map: CLASS_MAP — maps raw YOLO/Roboflow class names to unified schema.
             E.g. "cracked_screen" -> "screen_crack"
  Global state: _local_model (lazy-loaded YOLO), _local_model_load_attempted
  Key functions:
    _get_local_model() — Lazy-loads YOLOv8 from .pt file on first request.
    _run_local_model(image_bytes) -> DamageDetection|None
      Runs YOLOv8 inference. Takes highest-confidence box.
    _call_roboflow(image_bytes) -> dict|None
      Base64 encodes image, POSTs to Roboflow endpoint.
    detect_damage(image_bytes) -> DamageDetection
      Main entry point: tries local -> Roboflow -> Mock.
  Mock: Returns random damage type clearly labeled source="mock_fallback".
        Frontend shows warning banner.
  Essential: YES.

backend/app/ml_service.py
  Purpose: Loads trained ML model files and runs inference.
  DecisionEngine class:
    Loads 5 joblib files at startup: classifier, repair_model, resale_model,
    encoder, feature_schema.
    _build_feature_vector(...) -> np.ndarray
      Combines OHE-encoded categoricals + numeric features.
    predict(...) -> dict
      Returns recommendation, confidence, repair_cost_inr, resale_value_inr.
    KEY FIX: if damage_type=="none" AND functional_status=="fully_functional"
             then repair_cost is forced to 0.0 regardless of model output.
  FraudDetector class:
    Loads fraud_model.pkl (Isolation Forest).
    evaluate_fraud(price, condition_score, days_active) -> dict
      Returns {is_fraudulent: bool, score: float}.
  Singletons: decision_engine and fraud_detector loaded at import time.
  Essential: YES.

backend/app/marketplace_service.py
  Purpose: Marketplace CRUD — create/read/update/delete listings.
  Storage priority: Firestore (cloud) -> SQLite (local fallback).
  Fraud integration: create_listing() calls fraud_detector.evaluate_fraud().
    If flagged, listing status = "flagged" instead of "active".
  Key functions:
    create_listing(seller_uid, seller_email, req) -> MarketplaceListing
    get_listing(listing_id) -> MarketplaceListing|None
    list_listings(...) -> list[MarketplaceListing]
      Supports filtering by device_type, listing_type, category, condition,
      price range, and text search.
    update_status(listing_id, requester_uid, new_status) -> MarketplaceListing|None
      Enforces ownership (raises PermissionError if not owner).
    delete_listing(listing_id, requester_uid) -> bool
      Enforces ownership.
  Essential: YES.

backend/app/sqlite_store.py
  Purpose: SQLite persistence for marketplace listings when Firestore unavailable.
  Schema: listings(id TEXT PK, status TEXT, data TEXT)
    data column stores full listing as JSON blob.
  DB location: backend/data/marketplace.db (auto-created).
  Key functions: save(), get(), list_all(), update_status(), delete()
  Pattern: Module-level connection _conn initialized lazily on first use.
  Essential: YES (for zero-config local persistence).

backend/app/history_service.py
  Purpose: Per-user analysis history in Firestore.
  Firestore path: users/{uid}/analyses/{auto-id}
  Degrades: If Firestore not configured, save is no-op and get returns [].
  Functions:
    save_analysis(uid, record) — Adds created_at timestamp, writes to Firestore.
    get_history(uid, limit=50) -> list[dict] — Descending by created_at.
  Essential: Optional (history won't save without Firestore).

backend/app/chatbot.py
  Purpose: AI chatbot via Groq OpenAI-compatible API using LLaMA 3.3 70B.
  System prompt: Defines "Circuit assistant" persona with domain restrictions.
  Config: temperature=0.6, max_tokens=400.
  Functions:
    _fallback_reply() -> str — Returns instructional message (no GROQ key).
    get_chat_reply(messages) -> str — Prepends system prompt, calls Groq API.
  Essential: Optional (chatbot shows demo message without key).

backend/app/upgrade_advisor.py
  Purpose: AI upgrade path recommendations using Google Gemini API.
  Prompt: Asks for 2-3 specific upgrade paths for the Indian market in <200 words.
  Function: get_upgrade_advice(device_type, current_specs, budget_inr, use_case) -> str
  Essential: Optional (shows demo message without Gemini key).

backend/app/repair_shops.py
  Purpose: Finds nearby repair shops — 3-tier fallback.
  Tier 1: OpenStreetMap Overpass API (no key required, queries electronics/repair shops).
  Tier 2: OpenStreetMap Nominatim API (fallback search).
  Tier 3: Generated hardcoded realistic shop entries (always works).
  Key algorithm: haversine_distance(lat1, lon1, lat2, lon2) -> float (km)
                 Great-circle distance via Haversine formula.
  Function: find_nearby_repair_shops(lat, lng, radius_km) -> list[RepairShop]
  Essential: YES (always returns results via fallback).

backend/app/forecasting_service.py
  Purpose: Loads demand forecasting model and serves predictions.
  Behavior: Loads demand_forecast_model.pkl. If type is 'mock', returns hardcoded
            averages. If type is 'prophet', returns simplified trend data.
  Class: ForecastingService — singleton forecasting_service.
  Essential: Optional (returns mock data if model unavailable).

backend/app/part_matching_service.py
  Purpose: Rule-based part compatibility matching cross-referencing marketplace.
  COMPATIBILITY_RULES: Nested dict: brand -> model -> [compatible_models].
    Example: "apple" -> "iphone 12" -> ["iphone 12", "iphone 12 pro"]
  PartMatchingService class:
    _get_compatible_models(brand, model_name) -> list[str]
      Looks up rules or returns exact-match list.
    find_matches(device_type, brand, model_name, needed_part_category) -> list[dict]
      Queries all active listings, matches by compatible model,
      returns part or donor_device records with image_url.
  Essential: YES (core recommendation engine feature).

=== FRONTEND ===

frontend/src/main.jsx
  Purpose: React entry point. Mounts React tree into #root DOM element.
  Providers: ThemeProvider (outer) -> AuthProvider -> StrictMode -> App
  Runs once when browser loads the page.

frontend/src/App.jsx
  Purpose: Root application component. Implements SPA routing via state.
  View state: 'landing'|'analyze'|'dashboard'|'marketplace'|'sell'|'upgrade'|'shops'
  Key state: result, imageFile, lastDeviceMeta, openListing, marketplaceKey
  Functions: handleResult(), resetAnalysis(), handleListingCreated(), navigate()
  Note: No React Router — navigation is state-driven (browser back button does not work).

frontend/src/api.js
  Purpose: Centralized API client. All HTTP calls to backend live here.
  Base URL: VITE_API_URL env var, defaults to http://localhost:8000.
  Error handling: handleResponse(res) checks res.ok, extracts detail from error JSON.
  Exported functions:
    analyzeDevice, getUpgradeAdvice, getRepairShops, getDemandForecast,
    sendChatMessage, getHistory, createListing, browseListings, getListing,
    getPartMatches, updateListingStatus, deleteListing

frontend/src/index.css
  Purpose: Global design system.
  Contents: CSS custom properties (tokens), component classes, Tailwind base.
  Design tokens: Colors for both light/dark modes, 8px spacing grid, radii, shadows,
                 semantic verdict colors (sell=blue, repair=amber, recycle=red, upgrade=violet).
  Light mode: Warm cream/parchment palette.
  Dark mode: [data-theme="dark"] attribute override on <html>.
  Component classes: .card, .btn-primary, .btn-warm, .btn-outline, .btn-ghost,
                     .chip, .input-field, .hero-glow, .terminal-box.

frontend/src/context/AuthContext.jsx
  Purpose: React context providing auth state and actions app-wide.
  Demo mode: When Firebase not configured, creates a fake "demo" user locally.
             Generates a base64 mock JWT the backend can still decode (unverified).
  createDemoUser(email): Creates mock user with uid derived from email hash.
  Context value: { user, loading, signup, login, logout, firebaseConfigured }
  Exports: AuthProvider, useAuth

frontend/src/context/ThemeContext.jsx
  Purpose: Dark/light theme. Persists to localStorage. Auto-detects system preference.
  Mechanism: Sets data-theme="dark|light" on <html> element.
  Exports: ThemeProvider, useTheme

frontend/src/lib/firebase.js
  Purpose: Firebase SDK initialization from VITE_ env vars.
  Exports: auth (Firebase Auth instance or null), firebaseConfigured (bool).
  Graceful: If env vars missing, firebaseConfigured=false, auth=null.

frontend/src/lib/cloudinary.js
  Purpose: Image upload to Cloudinary CDN (used instead of Firebase Storage
           which now requires paid plan as of Feb 2026).
  Exports: cloudinaryConfigured (bool), uploadListingImage(file) -> Promise<URL>
  Used by: CreateListingForm.jsx before submitting a listing.

frontend/src/components/Nav.jsx
  Purpose: Sticky top navigation. Desktop links + mobile hamburger.
  Features: Theme toggle, auth button (sign in/out), Dashboard link only if logged in.

frontend/src/components/Hero.jsx
  Purpose: Landing page hero with animated SVG "phone crack detector" mockup.
  Key element: CSS @keyframes laserSweep animation on SVG rect element.

frontend/src/components/AuthModal.jsx
  Purpose: Modal dialog for login and signup.
  Features: Demo mode warning, password length validation, toggle login/signup.

frontend/src/components/AnalyzeForm.jsx
  Purpose: 3-step multi-page device analysis form.
  Step 0: Upload up to 4 images with drag-and-drop (DropZone sub-component).
  Step 1: Device specs — type, price tier, brand, model, RAM, storage.
  Step 2: Condition — original price, age, functional status, battery health slider.
  On submit: Calls analyzeDevice() API -> onResult(result, meta, primaryImage)

frontend/src/components/ResultPanel.jsx
  Purpose: Full analysis result display.
  Sections:
    1. Mock mode warning banner
    2. Verdict card: recommendation chip, damage preview image with detection overlay,
       financial estimates (repair cost / resale value), confidence progress bar.
    3. Compatible Donor Parts section (if recommendation="repair" and matches found).
    4. Action buttons (Find Shops, Create Listing, Upgrade Advisor, New Scan).
  Part matching: On mount when recommendation=="repair", maps damage_type to
                 part_category using DAMAGE_TO_PART_CATEGORY dict, fetches getPartMatches().

frontend/src/components/Dashboard.jsx
  Purpose: Authenticated user dashboard with 3 tabs.
  Tabs: ANALYSIS_LOG (history), ACTIVE_LISTINGS (user's own), DIAGNOSTIC_STATS (demand forecast).
  Stats tab: Fetches /api/demand-forecast and renders part demand cards.

frontend/src/components/Marketplace.jsx
  Purpose: Public listings browser with search + filter controls.
  Filters: device_type, listing_type, part category, condition, price range, text search.
  Renders: Grid of ListingCard components.

frontend/src/components/ListingCard.jsx
  Purpose: Compact listing card for browse grid. Shows cover image, type badge, title, price.

frontend/src/components/ListingDetail.jsx
  Purpose: Full-screen detail overlay for a single listing.
  Features: Image gallery, specs, seller info, mark-as-sold, delete (owner only).

frontend/src/components/CreateListingForm.jsx
  Purpose: Create new marketplace listing (whole device or individual parts).
  Image upload: Uses uploadListingImage() from cloudinary.js, stores URL.
  Auth required: Gets ID token from user.getIdToken() for Authorization header.

frontend/src/components/UpgradeAdvisor.jsx
  Purpose: Chat-style UI for Gemini upgrade advisor. Device type + specs + budget + use_case.

frontend/src/components/RepairShopFinder.jsx
  Purpose: Repair shop finder with Leaflet interactive map.
  Flow: Browser geolocation -> GET /api/repair-shops -> Leaflet map with markers + list.

frontend/src/components/ChatWidget.jsx
  Purpose: Floating chatbot accessible from any page (bottom-right corner).
  Features: Expandable panel, maintains message history, sends full conversation to /api/chat.

frontend/src/components/StatusChip.jsx
  Purpose: Colored verdict badge. STATUS_CONFIG maps verdict -> color/label/emoji.

frontend/src/components/StatusLegend.jsx
  Purpose: Landing page color legend for all 4 verdict categories.

frontend/src/components/TraceDivider.jsx
  Purpose: Decorative SVG PCB-trace divider between page sections.

=== ML SCRIPTS ===

ml/scripts/generate_synthetic_data.py
  Purpose: Generates 8000 synthetic device records with features and ML labels.
  Output: data/synthetic_devices.csv
  Labels generated: recommendation, estimated_repair_cost_inr, estimated_resale_value_inr

ml/scripts/train_models.py
  Purpose: Main training script. Trains 3 models from synthetic CSV.
  Models: RandomForestClassifier, XGBRegressor, LGBMRegressor
  Also saves: categorical_encoder.joblib, feature_schema.joblib
  Output: backend/models/*.joblib + ml/models/training_report.json

ml/scripts/train_fraud_detection.py
  Purpose: Trains Isolation Forest on synthetic listing data.
  Output: ml/models/fraud_model.pkl

ml/scripts/train_demand_forecast.py
  Purpose: Trains Prophet models for screen and battery demand forecasting.
  Output: ml/models/demand_forecast_model.pkl

ml/scripts/train_yolo.py
  Purpose: Fine-tunes YOLOv8n on merged damage image datasets.
  Base model: yolov8n.pt

ml/scripts/download_datasets.py
  Purpose: Downloads public Roboflow damage detection datasets.

ml/scripts/merge_datasets.py
  Purpose: Merges multiple Roboflow datasets, normalizes class labels.

---

# 4. TECHNOLOGY STACK

| Technology          | Purpose                                      | Free Tier       |
|---------------------|----------------------------------------------|-----------------|
| React 19            | Frontend UI framework                         | Open source     |
| Vite 8              | Frontend build tool + dev server              | Open source     |
| Tailwind CSS 4      | Utility CSS + design tokens                   | Open source     |
| FastAPI             | Backend API framework (Python, async)         | Open source     |
| Uvicorn             | ASGI server for FastAPI                       | Open source     |
| Pydantic v2         | Request/response validation + Settings        | Open source     |
| scikit-learn 1.8    | RandomForest, OneHotEncoder                   | Open source     |
| XGBoost             | Repair cost regression                        | Open source     |
| LightGBM            | Resale value regression                       | Open source     |
| YOLOv8 (Ultralytics)| Computer vision damage detection             | Open source     |
| Pillow              | Image preprocessing                           | Open source     |
| joblib              | Model serialization                           | Open source     |
| firebase-admin      | Token verification + Firestore               | Firebase Spark  |
| Firebase JS SDK     | Frontend auth + token generation              | Firebase Spark  |
| Cloudinary          | Image CDN for listings                        | 25GB free       |
| Google Gemini       | Upgrade advisor AI                            | 1M tokens/month |
| Groq + LLaMA 3.3   | Chatbot (OpenAI-compatible)                   | 14400 req/day   |
| OpenStreetMap       | Repair shop data (no key required)            | Free forever    |
| SQLite              | Listing persistence fallback                  | Built-in Python |
| Prophet (optional)  | Demand forecasting time series                | Open source     |
| Leaflet/react-leaflet| Interactive map for repair shops             | Open source     |

---

# 5. DEPENDENCY ANALYSIS

Backend (requirements.txt):
  fastapi >=0.110.0 — Web framework. Core dep.
  uvicorn[standard] >=0.29.0 — ASGI server.
  python-multipart >=0.0.9 — Required for File upload parsing in FastAPI.
  pydantic >=2.6.0 — Data validation.
  pydantic-settings >=2.2.0 — .env file loading.
  joblib >=1.3.0 — Load/save ML models.
  numpy >=1.24.0 — Feature vector math.
  scikit-learn==1.8.0 — RandomForest + OneHotEncoder (PINNED — model binary compatibility).
  xgboost >=2.0.0 — Repair cost model.
  lightgbm >=4.0.0 — Resale value model.
  requests >=2.31.0 — HTTP calls to Groq, Gemini, OSM, Roboflow.
  Pillow >=10.0.0 — Image decoding for YOLO inference.
  firebase-admin >=6.5.0 — Token verification + Firestore.
  ultralytics >=8.2.0 — YOLOv8 local model loading.

Frontend (package.json):
  react 19.2.7 — UI rendering.
  react-dom 19.2.7 — React DOM renderer.
  firebase 12.16.0 — Auth + token generation.
  leaflet 1.9.4 — Map tiles.
  react-leaflet 5.0.0 — React bindings for Leaflet.
  @vitejs/plugin-react 6.0.3 — JSX transform + HMR. (Dev)
  vite 8.1.1 — Build tool + dev server. (Dev)
  tailwindcss 4.3.3 — CSS utilities. (Dev)
  @tailwindcss/vite 4.3.3 — Tailwind Vite plugin. (Dev)
  oxlint 1.71.0 — Fast JS linter. (Dev)

---

# 6. ARCHITECTURE

## Overall Architecture Type
3-tier monolith with external AI service calls:
  Tier 1: Frontend (React SPA) — no server-side rendering
  Tier 2: Backend (FastAPI) — stateless REST API
  Tier 3: Storage / AI — Firebase Firestore, SQLite, Groq, Gemini, OpenStreetMap, Cloudinary

## Request Flow
  Browser -> React -> api.js fetch() -> FastAPI route -> service function -> response JSON
  All API calls use REST/HTTP. Auth via Bearer token in Authorization header.

## Initialization Sequence (Backend)
  1. uvicorn app.main:app --reload
  2. Python imports cascade:
     - config.py -> reads .env -> settings singleton
     - ml_service.py -> DecisionEngine() loads 5 joblib models
     - ml_service.py -> FraudDetector() loads fraud_model.pkl
     - forecasting_service.py -> loads demand_forecast_model.pkl
     - other modules imported (no heavy I/O)
  3. FastAPI() created, CORS middleware added
  4. All @app.get/@app.post routes registered
  5. Uvicorn binds to 0.0.0.0:8000 -> "Application startup complete"
  6. First request: Firebase lazy-init + YOLOv8 lazy-load (torch import)

## Initialization Sequence (Frontend)
  1. Browser loads index.html
  2. Vite serves main.jsx as ES module
  3. ThemeProvider reads localStorage -> sets data-theme on <html>
  4. AuthProvider checks firebaseConfigured:
     If true: onAuthStateChanged subscription to Firebase
     If false: reads 'circuit_demo_email' from localStorage
  5. App renders -> view='landing' -> Hero displayed
  6. User sees landing page in ~1-2 seconds

---

# 7. FRONTEND

## Views (SPA State Machine in App.jsx)
  'landing'     -> Hero + StatusLegend
  'analyze'     -> AnalyzeForm (then ResultPanel after result)
  'dashboard'   -> Dashboard (3 tabs: history/listings/stats)
  'marketplace' -> Marketplace (browse grid)
  'sell'        -> CreateListingForm
  'upgrade'     -> UpgradeAdvisor
  'shops'       -> RepairShopFinder

## Component Hierarchy
  App.jsx
    Nav.jsx -> AuthModal.jsx
    Hero.jsx (landing)
    AnalyzeForm.jsx -> ResultPanel.jsx -> StatusChip.jsx
    Dashboard.jsx -> StatusChip.jsx
    Marketplace.jsx -> ListingCard.jsx
    CreateListingForm.jsx -> lib/cloudinary.js
    ListingDetail.jsx
    UpgradeAdvisor.jsx
    RepairShopFinder.jsx
    ChatWidget.jsx (always visible)
    [openListing modal] -> ListingDetail.jsx

## State Management
  No external library (no Redux/Zustand/React Query).
  Local state: useState in each component.
  Shared state: React Context (AuthContext, ThemeContext).
  App-level state: App.jsx holds view, result, imageFile, lastDeviceMeta.

## Forms
  AnalyzeForm — 3-step multi-page with validation between steps.
  AuthModal — login/signup with client-side password length check.
  CreateListingForm — dynamic (switches whole device / parts mode).
  UpgradeAdvisor — structured fields feeding Gemini prompt.

## Styling
  CSS custom properties define all design tokens (colors, spacing, radii, shadows).
  Tailwind CSS 4 for layout utilities in JSX.
  Component classes in index.css (.card, .btn-primary, etc.) for reusable elements.
  Dark mode: [data-theme="dark"] attribute on <html>, CSS variable overrides.

---

# 8. BACKEND

## Server Startup Command
  cd backend
  ..\.venv\Scripts\uvicorn.exe app.main:app --reload
  Port: 8000 (default)

## Middleware
  CORSMiddleware: configurable allowed_origins (default: localhost:5173, localhost:3000)
  No rate limiting, no request logging middleware (development grade).

## Routes Table
  GET    /api/health                          None      Health check
  POST   /api/analyze-device                 Optional  Full device analysis
  POST   /api/upgrade-advice                 None      Gemini upgrade advice
  GET    /api/repair-shops                   None      Nearby shop lookup
  GET    /api/demand-forecast                None      Part demand forecast
  POST   /api/chat                           None      LLaMA chatbot
  GET    /api/history                        REQUIRED  User analysis history
  POST   /api/marketplace/listings           REQUIRED  Create listing
  GET    /api/marketplace/listings           None      Browse listings
  GET    /api/marketplace/listings/{id}      None      Get single listing
  PATCH  /api/marketplace/listings/{id}/status  REQUIRED  Update status
  DELETE /api/marketplace/listings/{id}      REQUIRED  Delete listing
  GET    /api/marketplace/matches            None      Find donor parts

## Authentication Flow
  1. Frontend: user.getIdToken() -> Firebase JWT or demo token
  2. Frontend: sends Authorization: Bearer <token>
  3. Backend auth_deps.py: extracts token
  4. firebase_admin_client.verify_token(): verifies or decodes
  5. Returns {"uid": "...", "email": "..."} dict to route handler

## Business Logic
  Fraud prevention: Every new whole_device listing scored by Isolation Forest.
    Anomalous -> status = "flagged" not "active".
  Repair cost = 0 override: If no damage + fully functional, repair_cost forced to 0.0.
  Part matching: Queries live marketplace with compatibility rules after diagnosis.

---

# 9. DATABASE

## Primary: Firestore (Google Firebase)
  Type: NoSQL document database (cloud-hosted).
  Collections:
    users/{uid}/analyses/{auto-id}  -> per-user analysis history
    listings/{listing_id}           -> all marketplace listings
  Used when: firebase-service-account.json is configured.

## Fallback: SQLite
  File: backend/data/marketplace.db (auto-created on first use).
  Schema:
    CREATE TABLE IF NOT EXISTS listings (
      id     TEXT PRIMARY KEY,
      status TEXT NOT NULL DEFAULT 'active',
      data   TEXT NOT NULL  -- full JSON blob of listing record
    )
  Used when: Firestore not configured (no service account JSON).
  Limitation: History does NOT fall back to SQLite. Without Firestore, history is not saved.

## No ORM
  SQLite accessed via Python stdlib sqlite3 with parameterized queries.
  Firestore accessed via firebase_admin.firestore client.

---

# 10. APIS

POST /api/analyze-device
  Auth: Optional (Bearer token)
  Content-Type: multipart/form-data
  Form fields: image (File), device_type, brand_tier, original_price_inr,
               age_months, battery_health_pct, functional_status
  Response example:
    {
      "detection": {"damage_type": "screen_crack", "damage_severity": 0.7,
                    "confidence": 0.85, "source": "yolo_local"},
      "recommendation": "repair",
      "recommendation_confidence": 0.89,
      "estimated_repair_cost_inr": 4500.00,
      "estimated_resale_value_inr": 12000.00,
      "explanation": "..."
    }
  Execution: image -> detect_damage() -> decision_engine.predict() -> save_analysis() -> return

GET /api/repair-shops
  Auth: None
  Query params: lat (float), lng (float), radius_km (float, default 5.0)
  Response: list of RepairShop objects with name, address, lat, lng, distance_km, rating

GET /api/demand-forecast
  Auth: None
  Response: {"forecasts": {"screen": {"trend": "...", "predicted_demand_score": 52.3}, ...}}

POST /api/chat
  Auth: None
  Body: {"messages": [{"role": "user", "content": "..."}, ...]}
  Response: {"reply": "..."}

GET /api/history
  Auth: REQUIRED (Bearer token)
  Response: array of last 50 analysis records, descending by date

POST /api/marketplace/listings
  Auth: REQUIRED
  Body: ListingCreateRequest (device_type, brand, model_name, listing_type,
        title, images[], price_inr, condition, parts[])
  Fraud check: Isolation Forest evaluation on create.
  Response: Full MarketplaceListing object

GET /api/marketplace/listings
  Auth: None
  Query params: device_type, listing_type, category, condition,
                min_price, max_price, search
  Response: Filtered array of MarketplaceListing objects

GET /api/marketplace/matches
  Auth: None
  Query params: device_type, brand, model_name, needed_part_category
  Response: {"matches": [{listing_id, type, title, price, condition,
                           seller_id, image_url, compatible_with}, ...]}

---

# 11. AI / MACHINE LEARNING

## Model 1: YOLOv8 (Damage Detection)
  Framework: Ultralytics YOLOv8n (nano variant)
  Architecture: YOLO — single-pass real-time object detection
  Input: PIL Image (RGB, any resolution — YOLO resizes to 640x640 internally)
  Output: Bounding boxes with class labels and confidence scores
  Classes: screen_crack, screen_scratch, dead_pixel, body_damage, keyboard_damage, none
  Inference: Highest confidence box taken as primary detection.
  Fallback chain: Local .pt file -> Roboflow API -> Mock random result
  Source: vision_service.py:detect_damage()

## Model 2: RandomForest Classifier (Recommendation)
  Framework: scikit-learn
  Hyperparameters: n_estimators=300, max_depth=12, min_samples_leaf=5, class_weight="balanced"
  Output: sell/repair/recycle/upgrade + probability per class
  Accuracy: 87.5% on held-out test set (train/test split 80/20)
  Top features (by importance): age_months (0.225), damage_severity (0.167),
    battery_health_pct (0.155), damage_type_none (0.099)
  Training data: Synthetic CSV with 8000 records
  Saved as: backend/models/recommendation_classifier.joblib

## Model 3: XGBoost Regressor (Repair Cost)
  Framework: XGBoost
  Hyperparameters: n_estimators=400, max_depth=6, learning_rate=0.05, subsample=0.8
  Output: Continuous float (INR)
  Metrics: MAE Rs.971, R2 0.964
  Override: Forced to 0 if damage_type="none" and functional_status="fully_functional"
  Saved as: backend/models/repair_cost_regressor.joblib

## Model 4: LightGBM Regressor (Resale Value)
  Framework: LightGBM
  Hyperparameters: n_estimators=400, max_depth=8, learning_rate=0.05
  Metrics: MAE Rs.1962, R2 0.988, MAPE 7.64%
  Saved as: backend/models/resale_value_regressor.joblib

## Model 5: Isolation Forest (Fraud Detection)
  Framework: scikit-learn
  Hyperparameters: n_estimators=100, contamination=0.05
  Input: [price, condition_score, days_active]
  Output: 1 (normal) or -1 (anomalous) + anomaly score
  Integration: Called in create_listing() — anomalous -> status="flagged"
  Saved as: ml/models/fraud_model.pkl

## Model 6: Prophet / Mock (Demand Forecasting)
  Framework: Facebook Prophet (optional) / simple average fallback
  Purpose: Forecasts demand for parts (screen, battery) over next period
  Training data: 365-day synthetic time series with monsoon seasonality for screens
  Saved as: ml/models/demand_forecast_model.pkl

## Feature Engineering (Shared Pipeline)
  Categorical: device_type, brand_tier, damage_type, functional_status
    -> OneHotEncoded by sklearn OneHotEncoder(handle_unknown="ignore")
  Numeric: original_price_inr, age_months, battery_health_pct, damage_severity
  Combined: np.hstack([numeric, cat_encoded]) -> unified feature vector
  Encoder + schema saved as joblib files for consistent inference encoding.

## AI Service Calls
  Groq/LLaMA 3.3 70B — Chatbot. OpenAI-compatible /chat/completions endpoint.
  Google Gemini 1.5 Flash — Upgrade advisor. Free tier, 1M tokens/month.

---

# 12. ALGORITHMS

## Haversine Distance
  File: repair_shops.py lines 17-29
  Purpose: Great-circle distance between two GPS coordinates.
  Formula: a = sin2(dlat/2) + cos(lat1)*cos(lat2)*sin2(dlon/2)
           d = 2*R*atan2(sqrt(a), sqrt(1-a))   where R=6371km
  Complexity: O(1)

## One-Hot Encoding
  Files: train_models.py, ml_service.py
  Purpose: Converts categorical strings to binary arrays for ML models.
  Example: device_type="phone" -> [1,0,0,0,0]
  Unknown categories at inference: all-zero vector (handle_unknown="ignore").

## Isolation Forest
  Purpose: Detect anomalous marketplace listings.
  How: Random decision trees isolate points. Anomalies isolated in fewer splits.
  contamination=0.05 means 5% of data expected to be anomalous.
  Decision function: negative score = anomalous, positive = normal.

## Part Matching
  File: part_matching_service.py
  Algorithm: Dictionary lookup -> filter marketplace listings.
  Complexity: O(n) where n = number of active listings.

---

# 13. KEY FUNCTIONS

detect_damage(image_bytes) [vision_service.py]
  Parameters: image_bytes: bytes
  Returns: DamageDetection (damage_type, severity, confidence, source)
  Purpose: Main CV inference entry point with 3-tier fallback.

decision_engine.predict(...) [ml_service.py]
  Parameters: device_type, brand_tier, damage_type, functional_status,
              original_price_inr, age_months, battery_health_pct, damage_severity
  Returns: dict with recommendation, confidence, repair_cost, resale_value
  Purpose: Full ML prediction pipeline.

fraud_detector.evaluate_fraud(price, condition_score, days_active) [ml_service.py]
  Returns: dict {is_fraudulent: bool, score: float}

create_listing(seller_uid, seller_email, req) [marketplace_service.py]
  Returns: MarketplaceListing
  Side effect: Fraud check, saves to Firestore or SQLite.

verify_token(id_token) [firebase_admin_client.py]
  Returns: dict|None {uid, email}
  Falls back to unverified base64 decode if Admin SDK not initialized.

get_chat_reply(messages) [chatbot.py]
  Returns: str — LLaMA chatbot response.

find_nearby_repair_shops(lat, lng, radius_km) [repair_shops.py]
  Returns: list[RepairShop]
  Tries Overpass -> Nominatim -> generated fallback.

haversine_distance(lat1, lon1, lat2, lon2) [repair_shops.py]
  Returns: float (kilometers)

save_analysis(uid, record) [history_service.py]
  Side effect: Writes to Firestore (no-op if unconfigured).

part_matching_service.find_matches(...) [part_matching_service.py]
  Returns: list[dict] — compatible parts/donor devices from marketplace.

uploadListingImage(file) [cloudinary.js]
  Returns: Promise<string> — Cloudinary secure_url.

analyzeDevice({...}) [api.js]
  Returns: Promise<AnalyzeResponse> — Full analysis result.

getPartMatches({deviceType, brand, modelName, neededPartCategory}) [api.js]
  Returns: Promise<{matches: list}> — Compatible donor parts.

---

# 14. CLASSES

Settings [config.py]
  Purpose: Configuration management singleton. Reads from .env.
  Pattern: Singleton (module-level `settings = Settings()`).

DecisionEngine [ml_service.py]
  Purpose: Loads and runs the 3 core ML models.
  Properties: clf, repair_model, resale_model, encoder, numeric_cols, categorical_cols
  Pattern: Singleton + Facade.

FraudDetector [ml_service.py]
  Purpose: Loads and runs Isolation Forest for fraud detection.
  Properties: model (IsolationForest or None)
  Pattern: Singleton.

ForecastingService [forecasting_service.py]
  Purpose: Loads demand forecast model, serves predictions.
  Pattern: Singleton.

PartMatchingService [part_matching_service.py]
  Purpose: Rule-based compatibility matching + marketplace query.
  Pattern: Singleton + Strategy (rules dictionary).

AuthProvider [AuthContext.jsx]
  Purpose: React context providing auth state and actions to all child components.
  Pattern: Provider (React Context).

ThemeProvider [ThemeContext.jsx]
  Purpose: Manages dark/light theme with localStorage persistence.
  Pattern: Provider (React Context).

---

# 15. DATA FLOW

## Complete Analyze Device Flow
  1. User fills AnalyzeForm (3 steps) and clicks "Run Diagnostic"
  2. AnalyzeForm.handleSubmit() calls api.js:analyzeDevice()
  3. api.js POSTs multipart/form-data to /api/analyze-device
  4. main.py route reads form fields + image bytes
  5. vision_service.detect_damage(image_bytes):
       a. Try _run_local_model() -> YOLOv8 inference
       b. If no local model -> _call_roboflow() -> Roboflow API
       c. If neither -> Mock random result
  6. decision_engine.predict(...):
       a. _build_feature_vector() -> OHE encode + hstack
       b. clf.predict(X) -> recommendation + probabilities
       c. repair_model.predict(X) -> repair cost
       d. resale_model.predict(X) -> resale value
       e. If damage="none" and fully_functional -> repair_cost = 0.0
  7. Build explanation string
  8. If user authenticated -> history_service.save_analysis()
  9. Return AnalyzeResponse JSON
  10. Frontend: result stored in App.jsx state
  11. ResultPanel renders
  12. If recommendation=="repair" and brand/model known:
        Map damage_type to part_category via DAMAGE_TO_PART_CATEGORY
        Call getPartMatches() -> GET /api/marketplace/matches
        Render donor matches grid

---

# 16. AUTHENTICATION

## Firebase Mode (Production)
  1. User submits AuthModal
  2. signInWithEmailAndPassword(auth, email, password) -> Firebase JWT
  3. All API calls: Authorization: Bearer <firebase_jwt>
  4. Backend verify_token() -> firebase_auth.verify_id_token() -> cryptographic RSA-256 check
  5. Returns {uid, email} dict

## Demo Mode (Firebase Not Configured)
  1. firebaseConfigured = false
  2. createDemoUser(email) creates local mock user
  3. Mock user has base64 JWT payload (no real signature)
  4. Backend falls back to _decode_unverified_token() -> base64 decode
  5. WARNING: Demo mode is NOT secure. Development only.

## Protected Routes
  /api/history                      - require_user
  POST /api/marketplace/listings    - require_user
  PATCH /api/marketplace/{id}/status - require_user + ownership check
  DELETE /api/marketplace/{id}      - require_user + ownership check

---

# 17. ENVIRONMENT VARIABLES

Backend (.env):
  YOLO_LOCAL_WEIGHTS_PATH     Default: models/yolo_damage_detector.pt
  YOLO_CONFIDENCE_THRESHOLD   Default: 0.35
  ROBOFLOW_API_KEY            Optional — Roboflow API key
  ROBOFLOW_MODEL_ENDPOINT     Optional — Roboflow model URL
  GROQ_API_KEY                Recommended — LLaMA chatbot
  GROQ_MODEL                  Default: llama-3.3-70b-versatile
  GEMINI_API_KEY              Recommended — upgrade advisor
  GEMINI_MODEL                Default: gemini-1.5-flash
  FIREBASE_CREDENTIALS_PATH   Recommended — path to service account JSON
  ALLOWED_ORIGINS             Default: ["http://localhost:5173","http://localhost:3000"]

Frontend (.env):
  VITE_API_URL                     Default: http://localhost:8000
  VITE_FIREBASE_API_KEY            Firebase web app API key
  VITE_FIREBASE_AUTH_DOMAIN        Firebase auth domain
  VITE_FIREBASE_PROJECT_ID         Firebase project ID
  VITE_FIREBASE_STORAGE_BUCKET     Firebase storage bucket
  VITE_FIREBASE_MESSAGING_SENDER_ID  Firebase sender ID
  VITE_FIREBASE_APP_ID             Firebase app ID
  VITE_CLOUDINARY_CLOUD_NAME       Cloudinary cloud name
  VITE_CLOUDINARY_UPLOAD_PRESET    Cloudinary unsigned upload preset

---

# 18. CONFIGURATION FILES

backend/requirements.txt
  Python package list with version constraints.
  Key pinned version: scikit-learn==1.8.0 (model binary compatibility).

frontend/package.json
  type: "module" (ES modules)
  scripts: dev (vite), build (vite build), lint (oxlint), preview (vite preview)

vite.config.js
  Plugins: @vitejs/plugin-react (JSX + HMR), @tailwindcss/vite (CSS processing)

backend/.env.example
  Developer template with comments for every variable.

---

# 19. DESIGN PATTERNS

Singleton
  Used for: decision_engine, fraud_detector, forecasting_service,
            part_matching_service, settings
  Why: ML models are expensive to load. Load once at startup, reuse.

Facade
  Used for: DecisionEngine.predict() hides 3 model calls behind one function.
  Why: Simplifies API route code.

Dependency Injection
  Used for: FastAPI Depends(get_optional_user), Depends(require_user)
  Why: Decouples auth logic from route handlers.

Strategy / Fallback Chain
  Used for: vision_service (local -> Roboflow -> Mock),
            repair_shops (Overpass -> Nominatim -> Generated)
  Why: Graceful degradation across failure modes.

Repository
  Used for: marketplace_service.py abstracts Firestore vs SQLite behind same interface.
  Why: Storage backend can change without touching route code.

Provider / Context
  Used for: AuthContext, ThemeContext
  Why: Avoids prop drilling for global auth/theme state.

Adapter
  Used for: CLASS_MAP in vision_service maps raw YOLO/Roboflow names to unified schema.
  Why: Normalizes two different classification vocabularies.

---

# 20. EXTERNAL SERVICES

Firebase Auth (Google)
  Used for: User authentication (sign in/sign up).
  API key: VITE_FIREBASE_* env vars.
  Free tier: Spark plan — no credit card, unlimited auth users.

Firebase Firestore (Google)
  Used for: User history + marketplace listings (if configured).
  API key: firebase-service-account.json (backend).
  Free tier: 1GB storage, 50k reads/day, 20k writes/day.

Google Gemini 1.5 Flash
  Used for: Upgrade advisor AI responses.
  API key: GEMINI_API_KEY.
  Free tier: 1 million tokens/month, 15 requests/minute.

Groq + LLaMA 3.3 70B
  Used for: Chatbot responses (OpenAI-compatible API).
  API key: GROQ_API_KEY.
  Free tier: 14,400 requests/day, 6,000 tokens/minute.

Roboflow
  Used for: Hosted YOLOv8 inference fallback.
  API key: ROBOFLOW_API_KEY.
  Free tier: 1,000 predictions/month.

OpenStreetMap Overpass API
  Used for: Repair shop lookup.
  No API key required — open data.

Cloudinary
  Used for: Image hosting for marketplace listings.
  API key: VITE_CLOUDINARY_CLOUD_NAME + VITE_CLOUDINARY_UPLOAD_PRESET.
  Free tier: 25GB storage, 25GB bandwidth/month.

---

# 21. SECURITY

Protected:
  Firebase JWTs cryptographically verified via firebase_auth.verify_id_token() (production).
  Ownership enforced: update/delete check seller_uid == requester_uid, raise HTTP 403 if not.
  CORS: Only whitelisted origins can call the API.
  Input validation: Pydantic schemas validate all request bodies (type, range, required fields).
  SQL injection prevention: SQLite uses parameterized queries with ? placeholders.
  XSS protection: React escapes all JSX content by default (no dangerouslySetInnerHTML).

Not Protected (Dev Tradeoffs):
  Demo mode JWT: Base64 decoded without signature verification. DEVELOPMENT ONLY.
  No rate limiting: Add nginx/cloudflare rate limiting for production.
  No HTTPS enforcement: Use reverse proxy with TLS in production.
  Secrets in .env: Gitignored but must never be committed.

---

# 22. PERFORMANCE

Backend:
  YOLOv8 lazy loading: Model not loaded until first /api/analyze-device request.
  Module-level singletons: ML models loaded once, reused for all requests.
  Synchronous inference: Vision + ML are blocking. For scale, use asyncio.run_in_executor.
  SQLite: Single module-level connection reused across requests.

Frontend:
  Object URL cleanup: ResultPanel revokes object URLs in useEffect cleanup.
  No memoization: No React.memo or useMemo (acceptable for capstone scale).
  No pagination: Marketplace fetches up to 200 listings (fine for demo).

---

# 23. ERROR HANDLING

Backend:
  Pydantic validation: Invalid requests -> HTTP 422 with field-level details.
  HTTPException: Business logic raises 400/401/403/404 as needed.
  ML model missing: FileNotFoundError if joblib files missing -> server fails to start.
  Vision service: All 3 tiers have try/except -> falls back without crashing.
  Firebase: Any credential error caught, logged, falls back to demo mode.
  External API calls: requests.RequestException caught in chatbot, upgrade advisor, repair shops.

Frontend:
  API errors: handleResponse() extracts detail field, throws Error.
  Inline error display: Forms show red error text.
  Loading states: All async operations use loading state variable.
  No global ErrorBoundary: Unhandled errors could crash the page (known limitation).

---

# 24. CODE FLOW (STARTUP TO USABLE)

Backend:
  $ ..\.venv\Scripts\uvicorn.exe app.main:app --reload
  -> Python imports cascade (config -> schemas -> firebase_client -> ml_service -> etc.)
  -> DecisionEngine() loads 5 joblib files (RF, XGBoost, LightGBM, encoder, schema)
  -> FraudDetector() loads Isolation Forest pkl
  -> ForecastingService() loads demand forecast pkl
  -> FastAPI app created, CORS added, routes registered
  -> Uvicorn binds to 0.0.0.0:8000 -> ready
  -> First analyze request: Firebase lazy-init + YOLOv8 lazy-load (torch import)

Frontend:
  $ npm run dev -> Vite serves http://localhost:5173
  -> Browser loads index.html
  -> Vite serves main.jsx as ES module
  -> ThemeProvider: reads localStorage -> sets data-theme
  -> AuthProvider: checks Firebase config -> subscribes to auth state or creates demo user
  -> App renders -> view='landing' -> Nav + Hero displayed
  -> User sees landing page in ~1-2 seconds

---

# 25. CALL GRAPH (KEY PATHS)

Analyze Device:
  AnalyzeForm.handleSubmit()
    -> api.js:analyzeDevice()
    -> POST /api/analyze-device [main.py]
    -> vision_service.detect_damage()
         -> _run_local_model() -> YOLO.predict()
         -> _call_roboflow()
         -> Mock fallback
    -> decision_engine.predict()
         -> _build_feature_vector() -> encoder.transform() + np.hstack()
         -> clf.predict() + predict_proba()
         -> repair_model.predict()
         -> resale_model.predict()
    -> history_service.save_analysis()
         -> get_firestore().collection("users")...add()
  -> ResultPanel renders
  -> getPartMatches() -> GET /api/marketplace/matches
  -> part_matching_service.find_matches()
  -> Donor matches UI renders

Create Listing:
  CreateListingForm.handleSubmit()
    -> cloudinary.js:uploadListingImage() [Cloudinary CDN]
    -> api.js:createListing()
    -> POST /api/marketplace/listings [main.py]
    -> marketplace_service.create_listing()
         -> fraud_detector.evaluate_fraud()
         -> get_firestore()...set() OR sqlite_store.save()

---

# 26. FILE DEPENDENCY GRAPH

main.jsx -> App.jsx -> api.js
         -> context/AuthContext.jsx -> lib/firebase.js
         -> context/ThemeContext.jsx

App.jsx -> components/Nav.jsx -> components/AuthModal.jsx
        -> components/Hero.jsx
        -> components/AnalyzeForm.jsx -> api.js
        -> components/ResultPanel.jsx -> components/StatusChip.jsx, api.js
        -> components/Dashboard.jsx -> components/StatusChip.jsx, api.js
        -> components/Marketplace.jsx -> components/ListingCard.jsx, api.js
        -> components/CreateListingForm.jsx -> lib/cloudinary.js, api.js
        -> components/ListingDetail.jsx -> api.js
        -> components/UpgradeAdvisor.jsx -> api.js
        -> components/RepairShopFinder.jsx -> api.js
        -> components/ChatWidget.jsx -> api.js

main.py -> config.py (settings)
        -> auth_deps.py -> firebase_admin_client.py -> config.py
        -> vision_service.py -> config.py, schemas.py
        -> ml_service.py -> (joblib model files)
        -> marketplace_service.py -> firebase_admin_client.py, sqlite_store.py, ml_service.py, schemas.py
        -> history_service.py -> firebase_admin_client.py
        -> chatbot.py -> config.py
        -> upgrade_advisor.py -> config.py
        -> repair_shops.py -> schemas.py
        -> forecasting_service.py -> (pkl file)
        -> part_matching_service.py -> marketplace_service.py
        -> schemas.py

---

# 27. SEQUENCE DIAGRAMS

## Login Flow
  User -> AuthModal -> AuthContext -> Firebase SDK
  User: clicks "Sign In"
  AuthModal: calls login(email, password)
  AuthContext: signInWithEmailAndPassword(auth, email, password)
  Firebase SDK: returns user object with getIdToken()
  AuthContext: setUser(user)
  AuthModal: onClose()
  Later: user.getIdToken() -> JWT -> Authorization: Bearer JWT -> Backend

## Analyze Device Flow
  User -> AnalyzeForm -> api.js -> FastAPI -> YOLOv8 -> DecisionEngine -> Firestore
  User: fills form, clicks Run Diagnostic
  AnalyzeForm: handleSubmit() -> api.js:analyzeDevice(formData)
  api.js: POST /api/analyze-device with FormData
  FastAPI: route reads form fields + image bytes
  FastAPI -> YOLOv8: detect_damage(image_bytes) -> DamageDetection
  FastAPI -> DecisionEngine: predict(...) -> {recommendation, costs}
  FastAPI -> Firestore: save_analysis(uid, record) [if authenticated]
  FastAPI -> api.js: AnalyzeResponse JSON
  api.js -> AnalyzeForm: result object
  AnalyzeForm -> App.jsx: onResult(result, meta, imageFile)
  App.jsx -> ResultPanel: renders
  ResultPanel: if repair -> getPartMatches() -> donor matches UI

## Marketplace Create Listing Flow
  User -> CreateListingForm -> Cloudinary -> api.js -> FastAPI -> Fraud Detector -> Storage
  User: fills form, selects images
  CreateListingForm: uploadListingImage(file) -> Cloudinary CDN -> secure_url
  CreateListingForm: api.js:createListing({...images: [secure_url]}, idToken)
  api.js: POST /api/marketplace/listings with JSON body + Bearer token
  FastAPI: auth check -> create_listing(uid, email, req)
  create_listing: fraud_detector.evaluate_fraud(price, condition_score, 0)
  create_listing: if is_fraudulent -> status="flagged"
  create_listing: save to Firestore or SQLite
  FastAPI: returns MarketplaceListing JSON

---

# 28. KNOWN LIMITATIONS

1. No tablet damage dataset — tablets share phone/laptop screen model. Accuracy is lower.
2. Synthetic ML training data — not real repair shop quotes or actual market prices.
3. Repair cost MAPE is high (2023%) — many near-zero cost devices skew relative error.
   Absolute MAE (Rs.971) is more meaningful metric.
4. No pagination — marketplace can slow down beyond few hundred listings.
5. No real-time features — no websockets, no live notifications.
6. No messaging system — buyers/sellers cannot contact each other within the app.
7. Compatibility rules are hardcoded — only small Apple and Samsung coverage.
8. No image size validation — large images processed without downsampling.
9. Demo mode JWT is not secure — backend accepts unverified tokens. Dev only.
10. No server-side pagination for Firestore — limited to 200 records per query.
11. Repair shop ratings are synthesized — OSM does not provide ratings.
12. Browser back button does not work — no React Router, navigation is state-based.

---

# 29. IMPROVEMENT SUGGESTIONS

Architecture:
  Add React Router for proper URL-based navigation (browser back button support).
  Separate ML inference into dedicated microservice for horizontal scaling.
  Add Redis for caching marketplace queries and demand forecast results.

Performance:
  Image resizing before YOLO inference (cap at 1280px).
  Server-side pagination for marketplace listings.
  useMemo for expensive filter operations in Marketplace component.
  Stream Gemini/Groq responses with SSE for better UX.

Security:
  Add rate limiting (e.g., slowapi for FastAPI).
  Enforce HTTPS via reverse proxy (Nginx/Caddy).
  Remove demo mode JWT decoding in production via environment flag.
  Add input sanitization for text search fields.

ML / AI:
  Collect real repair cost data from Indian repair shops for retraining.
  Expand compatibility rules database (ideally from hardware compatibility API).
  Add more damage classes: water damage, charging port damage.
  True Prophet forecasting for all part categories.

UX:
  Add contact/messaging system for buyers/sellers.
  Add listing analytics (views, saves, enquiries).
  Implement image gallery with swipe for listing detail.
  Add "Compare devices" feature for upgrade decisions.

Testing:
  pytest tests for all backend service functions.
  React Testing Library tests for form validation flows.
  Integration tests for the analyze endpoint.

---

# 30. GLOSSARY

API — Application Programming Interface: a way for two programs to talk to each other.
ASGI — Asynchronous Server Gateway Interface: how Python web servers handle async requests.
Bearer Token — security token in HTTP header: Authorization: Bearer <token>.
CORS — Cross-Origin Resource Sharing: browser security rule about cross-site API calls.
CSV — Comma-Separated Values: a simple tabular data file format.
Decision Engine — the ML pipeline combining image analysis + device specs for recommendations.
Dependency Injection — passing a function's dependencies in from the outside (by a framework).
Feature Vector — a list of numbers representing the input to a machine learning model.
Firestore — Google Firebase's cloud NoSQL database.
Gradient Boosting — ML technique training sequential decision trees (each fixing previous errors).
Haversine — formula for distance between two GPS coordinates on a sphere.
Isolation Forest — ML algorithm detecting anomalies by isolating data points with random trees.
Joblib — Python library for saving/loading machine learning models to disk.
JWT — JSON Web Token: compact cryptographically signed token for authentication.
LGBM/LightGBM — Light Gradient Boosting Machine: fast efficient gradient boosting framework.
Mock fallback — simulated response used when the real system is unavailable.
OHE — One-Hot Encoding: converts text categories to binary arrays for ML.
ORM — Object-Relational Mapper: library to interact with databases using language objects.
Pydantic — Python library for data type validation and schema definition.
Random Forest — ML algorithm building many decision trees and taking majority vote.
React Context — React's built-in way to share state between components without prop drilling.
SPA — Single-Page Application: website where navigation happens without full page reloads.
SQLite — lightweight file-based SQL database built into Python.
VITE — modern JavaScript build tool and development server.
XGBoost — Extreme Gradient Boosting: high-accuracy gradient boosting library.
YOLOv8 — You Only Look Once v8: real-time object detection model from Ultralytics.

---

# 31. BEGINNER'S GUIDE

Imagine you found an old phone in a drawer with a cracked screen. You wonder:
should I pay to fix it? Or sell it as-is? Or just recycle it?

Circuit helps you answer that question — instantly, using AI.

How it works:

1. YOU TAKE A PHOTO of your broken device and upload it to the Circuit website.

2. AN AI LOOKS AT YOUR PHOTO — like how a doctor looks at an X-ray.
   This AI (YOLOv8) was trained on thousands of damaged device photos.
   It says: "This phone has a cracked screen — about 70% damaged."

3. ANOTHER AI DOES THE MATH.
   It knows your phone is 2 years old, bought for Rs.30,000, battery at 75%,
   screen cracked. It looks at thousands of past cases and says:
   "Repair this — costs ~Rs.3,500 to fix, worth Rs.12,000 after."

4. YOU SEE THE RESULTS with a color-coded badge:
   Blue = Sell  |  Amber = Repair  |  Red = Recycle  |  Violet = Upgrade

5. IF YOU NEED A SPARE PART, Circuit checks if another user is selling it.
   If your screen is cracked and someone is selling a broken iPhone 12 Pro
   (same screen as iPhone 12), Circuit shows you their listing!

6. You can CHAT WITH THE AI ASSISTANT, FIND NEARBY REPAIR SHOPS on a map,
   or get UPGRADE ADVICE from Google's Gemini AI.

How files talk to each other:
  The website (React) sends orders to the server (FastAPI) — like a waiter at a restaurant.
  The server processes the order using AI models (stored as .pkl and .pt files on disk).
  User data is stored in Google Firebase's cloud database.
  Images are stored on Cloudinary's CDN (a photo storage service).

---

# 32. INTERVIEW PREPARATION

Q: Why FastAPI over Django or Flask?
A: FastAPI has native Pydantic integration for automatic request/response validation,
   automatic OpenAPI documentation, and async support. For a data-heavy app with ML
   inference, type safety at the API boundary is critical. Flask requires more boilerplate;
   Django is heavier than needed for an API-only backend.

Q: Why no React Router?
A: This is a college capstone with a time constraint. View state in App.jsx is simpler
   to implement at this scale. The tradeoff is browser back/forward navigation doesn't
   work — acceptable for a demo project.

Q: How does the vision service fallback chain work?
A: (1) Local YOLOv8 .pt file — no API calls, works offline, no cost.
   (2) Roboflow hosted inference — requires API key, useful before local training.
   (3) Mock random result — always works, clearly labeled with a warning banner.

Q: Why RandomForest for recommendation?
A: Robust to overfitting on small datasets, requires minimal hyperparameter tuning,
   provides predict_proba() for confidence scores, handles class imbalance via
   class_weight="balanced". 87.5% accuracy on synthetic data is strong.

Q: How do you handle repair cost = 0 for undamaged devices?
A: Post-model override in DecisionEngine.predict(): if damage_type=="none" AND
   functional_status=="fully_functional", repair cost is explicitly set to 0.0
   after the model prediction.

Q: What is Isolation Forest and how does it detect fraud?
A: Algorithm builds random decision trees and measures how many splits to isolate
   each data point. Anomalies (very low/high prices) are isolated in fewer splits.
   contamination=0.05 means we expect 5% of data to be anomalous.

Q: Why both Firestore and SQLite?
A: Firestore is production database for multi-user persistence but requires Firebase
   setup. SQLite provides automatic zero-configuration local persistence. App works
   fully out of the box for local development without Firebase.

Q: What were biggest technical challenges?
A: (1) Graceful degradation — making every external service optional with fallbacks.
   (2) Repair cost logic — ML model outputs non-zero cost even for undamaged devices;
       added post-model override.
   (3) Firebase Storage pricing changed Feb 2026 (paid-only), requiring pivot to
       Cloudinary for image hosting.

Q: How does part matching work?
A: Combines a hardcoded COMPATIBILITY_RULES dictionary with live marketplace query.
   When user gets "repair" recommendation, frontend maps damage_type to part_category,
   queries /api/marketplace/matches. Backend looks up compatible models and filters
   active listings by device_type, brand, and compatible model names.

---

# 33. PROJECT RECREATION GUIDE

Prerequisites: Python 3.11+, Node.js 20+, Git, pip, npm

Step 1: Clone
  git clone https://github.com/Aayush-3108/circuit-electronic-diagnosis-and-marketplace.git
  cd circuit-electronic-diagnosis-and-marketplace

Step 2: Backend Setup
  cd backend
  python -m venv ../.venv
  ../.venv/Scripts/activate       # Windows
  # source ../.venv/bin/activate  # Linux/Mac
  pip install -r requirements.txt
  cp .env.example .env
  # Edit .env with your API keys

Step 3: Train ML Models
  cd ../ml/scripts
  pip install -r requirements.txt
  python generate_synthetic_data.py    # creates data/synthetic_devices.csv
  python train_models.py               # saves to backend/models/
  python train_fraud_detection.py      # saves to ml/models/
  python train_demand_forecast.py      # saves to ml/models/
  # Optional YOLOv8 training (requires Roboflow datasets):
  # python download_datasets.py
  # python merge_datasets.py
  # python train_yolo.py

Step 4: Frontend Setup
  cd ../../frontend
  npm install
  # Create .env with Firebase + Cloudinary config
  # Minimum: VITE_API_URL=http://localhost:8000

Step 5: Run Development Servers
  Terminal 1 (Backend):
    cd backend
    ../.venv/Scripts/uvicorn.exe app.main:app --reload
  Terminal 2 (Frontend):
    cd frontend
    npm run dev

Step 6: Access
  Frontend: http://localhost:5173
  Backend API docs: http://localhost:8000/docs

Common Issues:
  ModuleNotFoundError: uvicorn
    -> Use ../.venv/Scripts/uvicorn.exe not system python.
  FileNotFoundError: recommendation_classifier.joblib
    -> Run python train_models.py in ml/scripts/ first.
  Firebase not configured warning
    -> App still works in demo mode. For persistent data, set up Firebase.
  Image upload fails
    -> Set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET in frontend/.env

---

# 34. SOURCE CODE REFERENCES

App routing state machine         App.jsx lines 17-45
CORS configuration                backend/app/main.py lines 45-53
YOLOv8 class name mapping         vision_service.py lines 31-44
3-tier fallback logic             vision_service.py lines 130-164
Feature vector construction       ml_service.py lines 26-40
Repair cost zero override         ml_service.py lines 65-66
Fraud detection on listing create marketplace_service.py lines 32-36
SQLite schema                     sqlite_store.py lines 30-38
Firebase graceful degradation     firebase_admin_client.py lines 41-67
Demo mode JWT creation            AuthContext.jsx lines 12-26
Unverified token fallback         firebase_admin_client.py lines 102-125
Compatibility rules dict          part_matching_service.py lines 7-17
Haversine formula                 repair_shops.py lines 17-29
3-tier repair shop fallback       repair_shops.py lines 161-185
Damage to part category mapping   ResultPanel.jsx lines 4-12
Donor matches fetch               ResultPanel.jsx lines 41-56
Demand forecast rendering         Dashboard.jsx (StatsTab section)
Theme CSS variables               index.css lines 6-59
Dark mode overrides               index.css lines 61-90
RandomForest hyperparameters      train_models.py lines 59-64
XGBoost hyperparameters           train_models.py lines 124-131
LightGBM hyperparameters          train_models.py lines 140-147
Chatbot system prompt             chatbot.py lines 17-35
Gemini prompt construction        upgrade_advisor.py lines 23-30

---

# 35. FINAL PROJECT SUMMARY

Circuit is a complete, full-stack, AI-powered electronics diagnostic and marketplace application
built as a college capstone project entirely on free-tier services.

THE CORE INNOVATION is the end-to-end pipeline from a device photo to a financially-justified
sell/repair/recycle/upgrade recommendation:

  1. YOLOv8 computer vision classifies physical damage from photos.
  2. RandomForest classifier (87.5% accuracy) combines damage + device specs for recommendation.
  3. XGBoost (R2=0.964) estimates repair cost in Indian Rupees.
  4. LightGBM (R2=0.988) estimates resale value in Indian Rupees.
  5. All results surface through a premium-quality React UI with dark/light mode.

THE MARKETPLACE allows peer-to-peer buying/selling of whole devices or individual components:
  - Isolation Forest fraud detection on every new listing (5% contamination threshold)
  - Cross-user part compatibility matching (hardcoded compatibility rules + live query)
  - Image hosting via Cloudinary CDN

THE AI ECOSYSTEM integrates three generative AI providers:
  - Groq/LLaMA 3.3 70B for floating chatbot (OpenAI-compatible)
  - Google Gemini 1.5 Flash for upgrade advisor
  - OpenStreetMap Overpass for free, keyless repair shop discovery

ENGINEERING DECISIONS consistently prioritize graceful degradation:
  - Without Firebase: SQLite fallback for listings, demo auth mode
  - Without YOLOv8: mock detection with UI warning banner
  - Without Groq/Gemini: instructional error messages with setup links
  - Without Cloudinary: image upload disabled with clear error

KEY METRICS FROM TRAINING:
  Recommendation classifier:  87.5% accuracy
  Resale value regressor:     R2=0.988, MAE=Rs.1962
  Repair cost regressor:      R2=0.964, MAE=Rs.971
  Fraud detector:             5% contamination, 100-estimator Isolation Forest
  YOLOv8:                     87.3% stated detection accuracy (from project hero)

THE CODEBASE spans approximately 5,000 lines of code across 40+ files organized in three clear
layers (frontend, backend, ml). The clean separation of concerns — schemas define the contract,
services implement business logic, routes wire them together — demonstrates a production-quality
architecture implemented within a Rs.0 budget constraint.

This project demonstrates mastery of:
  Full-stack web development (React + FastAPI)
  Machine learning pipeline (training + inference + deployment)
  Computer vision (YOLOv8 integration)
  Cloud services integration (Firebase, Cloudinary, Groq, Gemini)
  System design (graceful degradation, fallback chains, singleton patterns)
  Database design (Firestore + SQLite dual persistence)
  AI product development (end-to-end from data to deployed AI feature)

--- END OF DOCUMENTATION ---
