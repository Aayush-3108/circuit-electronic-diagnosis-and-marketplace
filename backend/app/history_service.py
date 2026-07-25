"""
Per-user analysis history, stored in Firestore under:
    users/{uid}/analyses/{auto-id}

Degrades gracefully: if Firestore isn't configured (no service account),
save_analysis() is a silent no-op and get_history() returns an empty list --
the core analyze flow keeps working either way, it just won't persist.
"""

from datetime import datetime, timezone

from app.firebase_admin_client import get_firestore


def save_analysis(uid: str, record: dict) -> None:
    db = get_firestore()
    if db is None:
        return
    record = {**record, "created_at": datetime.now(timezone.utc).isoformat()}
    db.collection("users").document(uid).collection("analyses").add(record)


def get_history(uid: str, limit: int = 50) -> list[dict]:
    db = get_firestore()
    if db is None:
        return []
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
        data["id"] = doc.id
        results.append(data)
    return results
