"""
Per-user analysis history, stored in Firestore when available and SQLite as durable fallback.
"""

from datetime import datetime, timezone
import logging
import uuid

from app.firebase_admin_client import get_firestore
from app import sqlite_store

logger = logging.getLogger(__name__)


def save_analysis(uid: str, record: dict) -> dict:
    analysis_id = str(record.get("id") or uuid.uuid4())
    now_iso = record.get("created_at") or datetime.now(timezone.utc).isoformat()
    record = {**record, "id": analysis_id, "created_at": now_iso}

    db = get_firestore()
    if db is not None:
        try:
            db.collection("users").document(uid).collection("analyses").document(analysis_id).set(record)
        except Exception as exc:
            logger.warning("[History] Failed to write analysis to Firestore: %s", exc)

    # Always persist to SQLite so it survives restarts and works seamlessly offline/locally
    try:
        sqlite_store.save_analysis(uid, record)
    except Exception as exc:
        logger.error("[History] Failed to write analysis to SQLite: %s", exc)

    return record


def get_history(uid: str, limit: int = 50) -> list[dict]:
    db = get_firestore()
    if db is not None:
        try:
            docs = (
                db.collection("users")
                .document(uid)
                .collection("analyses")
                .order_by("created_at", direction="DESCENDING")
                .limit(limit)
                .stream()
            )
            results = []
            for doc in docs:
                data = doc.to_dict()
                if "id" not in data:
                    data["id"] = doc.id
                results.append(data)
            if results:
                return results
        except Exception as exc:
            logger.warning("[History] Failed to fetch history from Firestore: %s", exc)

    # Fallback to local SQLite store
    try:
        return sqlite_store.get_analyses_by_user(uid, limit=limit)
    except Exception as exc:
        logger.error("[History] Failed to fetch history from SQLite: %s", exc)
        return []
