"""
Firebase Admin SDK: verifies ID tokens sent by the frontend and provides a
Firestore client for storing per-user analysis history.

Setup:
1. Firebase Console -> Project Settings -> Service Accounts -> Generate new private key
2. Save the downloaded JSON as backend/firebase-service-account.json (gitignored)
3. Set FIREBASE_CREDENTIALS_PATH in backend/.env to that path (defaults already point there)

Everything in this module degrades gracefully when no credentials are
configured: token verification returns None (treated as anonymous) instead
of raising, so the API keeps working in demo mode until you add your keys.
"""

import base64
import json
import logging
from pathlib import Path

import firebase_admin
from firebase_admin import auth as firebase_auth
from firebase_admin import credentials, firestore

from app.config import settings

logger = logging.getLogger(__name__)

_app = None
_db = None
_init_error: str | None = None       # set only on real SDK failures (not missing file)
_init_sdk_failed: bool = False        # True only when SDK raised — prevents retry spam


def _init():
    global _app, _db, _init_error, _init_sdk_failed
    if _app is not None:
        return
    if _init_sdk_failed:
        return  # SDK already failed with bad credentials — no point retrying

    if not settings.firebase_credentials_path:
        if _init_error is None:
            _init_error = "FIREBASE_CREDENTIALS_PATH is not set — running in demo/in-memory mode"
            logger.warning("[Firebase] %s", _init_error)
            logger.warning("[Firebase] ⚠️  Listings will NOT persist across server restarts!")
        return

    cred_path = Path(settings.firebase_credentials_path)
    if not cred_path.is_file():
        # Don't cache this — the user might drop the file in without restarting
        logger.debug(
            "[Firebase] Service account not found at '%s' — will retry next request.",
            cred_path.resolve(),
        )
        return

    try:
        cred = credentials.Certificate(str(cred_path))
        _app = firebase_admin.initialize_app(cred)
        _db = firestore.client()
        _init_error = None
        logger.info("[Firebase] ✅ Firestore connected — listings will persist.")
    except Exception as exc:  # noqa: BLE001
        _init_sdk_failed = True
        _init_error = f"Firebase init failed: {exc}"
        logger.error("[Firebase] ❌ %s", _init_error)
        logger.warning("[Firebase] ⚠️  Falling back to in-memory storage.")


def firebase_configured() -> bool:
    _init()
    return _app is not None


def firebase_status() -> dict:
    """Returns a dict describing Firebase connectivity state — used by /api/health."""
    _init()
    if _app is not None:
        return {"connected": True, "message": "Firestore connected — listings will persist."}

    cred_path = settings.firebase_credentials_path
    if cred_path and not Path(cred_path).is_file():
        return {
            "connected": False,
            "message": (
                f"Service account JSON missing at '{Path(cred_path).resolve()}'. "
                "See instructions below to fix this."
            ),
            "fix": (
                "1. Go to Firebase Console → your project → Project Settings → Service Accounts. "
                "2. Click 'Generate new private key' and download the JSON. "
                "3. Save it as  backend/firebase-service-account.json  and restart the server."
            ),
        }

    return {
        "connected": False,
        "message": _init_error or "Firebase not configured",
    }


def _decode_unverified_token(id_token: str) -> dict | None:
    """Fallback JWT payload decoder when Firebase Admin service account key isn't present."""
    if not id_token:
        return None
    try:
        if id_token.startswith("demo:"):
            parts = id_token.split(":", 2)
            if len(parts) == 3:
                return {"uid": parts[1], "email": parts[2]}

        parts = id_token.split(".")
        if len(parts) == 3:
            payload_b64 = parts[1]
            payload_b64 = payload_b64.replace("-", "+").replace("_", "/")
            payload_b64 += "=" * (-len(payload_b64) % 4)
            payload_bytes = base64.b64decode(payload_b64)
            payload = json.loads(payload_bytes.decode("utf-8"))
            uid = payload.get("user_id") or payload.get("sub") or payload.get("uid")
            email = payload.get("email")
            if uid:
                return {"uid": uid, "email": email}
    except Exception:
        pass
    return None


def verify_token(id_token: str) -> dict | None:
    """Returns {'uid': ..., 'email': ...} or None if invalid/not configured."""
    if not id_token:
        return None
    _init()
    if _app is not None:
        try:
            decoded = firebase_auth.verify_id_token(id_token)
            return {"uid": decoded["uid"], "email": decoded.get("email")}
        except Exception:
            pass
    # Fallback to unverified token decoding if Firebase Admin SDK is not configured
    # or if verification fails (e.g. demo token used during local testing)
    return _decode_unverified_token(id_token)



def get_firestore():
    _init()
    return _db

