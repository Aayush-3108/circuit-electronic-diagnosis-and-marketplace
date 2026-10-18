# ReCircuit — Complete Production Deployment Guide

This guide provides a comprehensive, step-by-step walkthrough to deploy both the **FastAPI Backend** and the **React + Vite Frontend** of the **ReCircuit** platform to production.

---

## 🏗️ Architecture & Recommended Deployment Stack

| Component | Recommended Host | Free Tier Available? | Build Artifact / Runtime |
| :--- | :--- | :--- | :--- |
| **Frontend** (`frontend/`) | **Vercel** (or Netlify) | ✅ Yes (Free Global CDN) | Static SPA (`dist/` via Vite) |
| **Backend** (`backend/`) | **Render** (or Railway) | ✅ Yes | Python 3.11+ / Uvicorn ASGI |
| **Database** | SQLite / Firebase Firestore | ✅ Yes | `backend/data/marketplace.db` |
| **Auth & Storage** | Firebase Spark Plan | ✅ Yes | Firebase Auth + Cloudinary |

> **Monorepo Note**: This repository contains both `frontend/` and `backend/` in subdirectories. When deploying on Vercel, Render, or Railway, you **must set the Root Directory** setting to either `frontend` or `backend`.

---

## 📋 Pre-Deployment Checklist

Before deploying, ensure you have your free-tier API keys ready:

1. **Google Gemini API Key**: [Get key at Google AI Studio](https://aistudio.google.com/apikey)
2. **Groq API Key**: [Get key at Groq Console](https://console.groq.com/keys)
3. **Firebase Project** *(Optional for basic demo, required for saved history)*: [Firebase Console](https://console.firebase.google.com)
4. **Cloudinary Account** *(For marketplace image uploads)*: [Cloudinary Console](https://cloudinary.com/console)
5. **GitHub Account**: Ensure all changes are committed and pushed to your GitHub repository.

---

## Part 1: Deploying the Backend (FastAPI)

We recommend **Render** for the backend because it offers a free Python web service tier with HTTPS out of the box.

### Step 1: Create a New Web Service on Render
1. Go to [dashboard.render.com](https://dashboard.render.com/) and sign in.
2. Click **New +** in the top navigation and select **Web Service**.
3. Choose **Build and deploy from a Git repository** and connect your GitHub repository:
   ```
   https://github.com/Aayush-3108/circuit-electronic-diagnosis-and-marketplace
   ```

### Step 2: Configure Service Settings
Fill in the deployment configuration fields:

| Field | Configuration Value | Notes |
| :--- | :--- | :--- |
| **Name** | `recircuit-backend` | (or your chosen name) |
| **Region** | Select region closest to you (e.g. *Singapore*, *Oregon*, *Frankfurt*) | |
| **Branch** | `main` | |
| **Root Directory** | `backend` | **CRITICAL**: Do not leave empty! |
| **Runtime** | `Python 3` | |
| **Build Command** | `pip install -r requirements.txt` | |
| **Start Command** | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` | Automatically binds to Render's port |
| **Instance Type** | `Free` | |

---

### Step 3: Add Backend Environment Variables
Scroll down to the **Environment Variables** section on Render and click **Add Environment Variable** for each:

| Key | Example Value | Description |
| :--- | :--- | :--- |
| `PYTHON_VERSION` | `3.11.9` | Ensures compatible Python runtime |
| `GEMINI_API_KEY` | `your_gemini_api_key` | Free key from Google AI Studio |
| `GEMINI_MODEL` | `gemini-flash-lite-latest` | Fast, high-capacity model |
| `GROQ_API_KEY` | `gsk_...` | Free key from Groq Console |
| `GROQ_MODEL` | `openai/gpt-oss-20b` | Chatbot model |
| `ALLOWED_ORIGINS` | `http://localhost:5173,https://your-frontend.vercel.app` | Comma-separated list of allowed frontend origins |
| `YOLO_LOCAL_WEIGHTS_PATH` | `models/yolo_damage_detector.pt` | Path to damage detection model |
| `YOLO_CONFIDENCE_THRESHOLD` | `0.35` | Confidence cutoff |
| `FRAUD_MODEL_PATH` | `models/isolation_forest_fraud.joblib` | Isolation Forest trained model artifact |
| `FRAUD_FEATURE_SCHEMA_PATH` | `models/fraud_feature_schema.joblib` | Model feature names & min/max scoring schema |
| `FRAUD_CONTAMINATION` | `0.05` | Expected anomaly contamination rate (0.05 = 5%) |
| `FRAUD_MODEL_VERSION` | `isolation_forest_v1.0` | Active model identifier tag |
| `ADMIN_EMAILS` | `admin@recircuit.com,csdeshmukh3108@gmail.com` | Comma-separated emails allowed access to the Fraud Center |
| `AUTH_RATE_LIMIT_MAX_ATTEMPTS` | `5` | Maximum failed logins before temporary cooldown |
| `AUTH_RATE_LIMIT_WINDOW_MINUTES` | `10` | Rolling window to track failed attempts |
| `AUTH_RATE_LIMIT_COOLDOWN_MINUTES`| `15` | Cooldown duration for locked accounts |

*(Note: If you don't know your frontend Vercel URL yet, set `ALLOWED_ORIGINS` to `*` temporarily or update it once your frontend is live).*

---

### Step 4: (Optional) Persistent Disk for SQLite
On Render's free tier, the filesystem is ephemeral (resets on restart).
* If you upgrade to a Render Starter plan ($7/mo), click **Disks** → **Add Disk**, set **Mount Path** to `/app/data` and size to `1 GB`.
* On the free tier, listings and devices will persist in memory while the server runs, or you can connect Firebase Firestore for permanent zero-cost persistence.

---

### Step 5: Deploy & Verify
1. Click **Create Web Service**.
2. Render will clone the repository, install Python dependencies from `backend/requirements.txt`, and start Uvicorn.
3. Once the log displays `Application startup complete`, note your live backend URL (e.g. `https://recircuit-backend.onrender.com`).
4. **Verify Health**: Open `https://recircuit-backend.onrender.com/api/health` in your browser. You should see:
   ```json
   {
     "status": "ok",
     "firebase": { ... },
     "storage_mode": "..."
   }
   ```
5. **Interactive API Docs**: View the Swagger documentation at `https://recircuit-backend.onrender.com/docs`.

---

## Part 2: Deploying the Frontend (React + Vite)

We recommend **Vercel** for the frontend because it natively detects Vite projects, provides instant global edge caching, and automatically redeploys on `git push`.

### Step 1: Import Project into Vercel
1. Go to [vercel.com](https://vercel.com/) and sign in with GitHub.
2. Click **Add New...** → **Project**.
3. Select your repository: `circuit-electronic-diagnosis-and-marketplace` and click **Import**.

### Step 2: Configure Project & Root Directory
In the **Configure Project** screen:

1. **Framework Preset**: Select **Vite** (if not auto-selected).
2. **Root Directory**: Click **Edit** next to Root Directory and select the `frontend` folder:
   ```text
   Root Directory: frontend
   ```
   *(This ensures Vercel runs `npm install` and `npm run build` inside `frontend/`).*

---

### Step 3: Add Frontend Environment Variables
Expand the **Environment Variables** section in Vercel and add:

| Key | Value | Description |
| :--- | :--- | :--- |
| `VITE_API_URL` | `https://recircuit-backend.onrender.com` | **Your live Render backend URL** (no trailing slash) |
| `VITE_FIREBASE_API_KEY` | `AIzaSy...` | From Firebase Console |
| `VITE_FIREBASE_AUTH_DOMAIN` | `your-app.firebaseapp.com` | From Firebase Console |
| `VITE_FIREBASE_PROJECT_ID` | `your-app-id` | From Firebase Console |
| `VITE_FIREBASE_STORAGE_BUCKET` | `your-app.firebasestorage.app` | From Firebase Console |
| `VITE_FIREBASE_MESSAGING_SENDER_ID`| `123456789` | From Firebase Console |
| `VITE_FIREBASE_APP_ID` | `1:123456:web:...` | From Firebase Console |
| `VITE_CLOUDINARY_CLOUD_NAME` | `your_cloud_name` | For image uploads |
| `VITE_CLOUDINARY_UPLOAD_PRESET` | `your_unsigned_preset` | For image uploads |

*(Note: If Firebase or Cloudinary keys are omitted, the frontend runs in graceful fallback/demo mode).*

---

### Step 4: Deploy & Verify
1. Click **Deploy**.
2. Vercel will install dependencies, execute `npm run build`, and deploy your static build.
3. Once completed, Vercel gives you a production URL (e.g. `https://recircuit.vercel.app`).
4. SPA routing rewrites are already configured in [`frontend/vercel.json`](file:///d:/.Mini%20Project/git/circuit-electronic-diagnosis-and-marketplace/frontend/vercel.json) to prevent 404s on page refresh.

---

## Part 3: Connecting the Frontend & Backend (Closing the Loop)

Now that both services are deployed, update the backend CORS configuration so the browser permits API requests:

1. Copy your live Vercel frontend URL (e.g. `https://recircuit.vercel.app`).
2. Go to your **Render Dashboard** → Select **recircuit-backend** → Click **Environment**.
3. Update the `ALLOWED_ORIGINS` variable:
   ```env
   ALLOWED_ORIGINS=https://recircuit.vercel.app,http://localhost:5173
   ```
4. Click **Save Changes**. Render will automatically restart the backend with the new allowed origin.

---

## 🐳 Alternative: Deploy with Docker (Railway / Fly.io / VPS)

If you prefer containerized deployment or self-hosting on a VPS (DigitalOcean, AWS, Linode):

A production-ready [`backend/Dockerfile`](file:///d:/.Mini%20Project/git/circuit-electronic-diagnosis-and-marketplace/backend/Dockerfile) is included in the repository.

### Build and Run Locally or on a VPS:
```bash
# Navigate to backend
cd backend

# Build Docker image
docker build -t recircuit-backend .

# Run container with environment variables
docker run -d \
  -p 8000:8000 \
  --name recircuit-api \
  -e GEMINI_API_KEY="your_gemini_key" \
  -e GROQ_API_KEY="your_groq_key" \
  -e ALLOWED_ORIGINS="https://recircuit.vercel.app" \
  -v $(pwd)/data:/app/data \
  recircuit-backend
```

---

## 🔍 Troubleshooting & Common Issues

### 1. CORS Error: `Access-Control-Allow-Origin` in browser console
- **Cause**: The frontend URL does not match the origins in `ALLOWED_ORIGINS`.
- **Fix**: Check `ALLOWED_ORIGINS` in Render. Ensure it includes the exact Vercel URL with `https://` and without a trailing slash (e.g. `https://recircuit.vercel.app`).

### 2. Render Free Tier Spin-down / Cold Starts
- **Behavior**: Free instances on Render spin down after 15 minutes of inactivity. The first request after sleep takes 30–50 seconds to boot.
- **Solution**: Set up a free monitor at [UptimeRobot.com](https://uptimerobot.com) to ping `https://your-backend.onrender.com/api/health` every 10 minutes to keep it warm.

### 3. Vercel 404 on Refresh
- **Cause**: Standard single-page apps require server rewrites so all route paths point to `index.html`.
- **Fix**: Verify that [`frontend/vercel.json`](file:///d:/.Mini%20Project/git/circuit-electronic-diagnosis-and-marketplace/frontend/vercel.json) is present in the repository with the rewrite rule:
  ```json
  {
    "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
  }
  ```

### 4. Gemini API 503 / High Demand
- **Solution**: The backend already implements an automatic fallback chain (`gemini-flash-lite-latest` → `gemini-3.1-flash-lite` → `gemini-3.5-flash-lite`). Ensure your `GEMINI_API_KEY` is added to Render.

---

## 🎉 Verification Checklist

After completing the steps above:

- [ ] Backend health check responds with `200 OK` at `https://your-backend/api/health`
- [ ] Swagger API documentation loads at `https://your-backend/docs`
- [ ] Frontend loads smoothly at `https://your-app.vercel.app`
- [ ] Image diagnosis and YOLO model inference work end-to-end
- [ ] Upgrade Advisor provides recommendations without CORS or API key errors
- [ ] Device registration and Component Reuse Vault tab are accessible
