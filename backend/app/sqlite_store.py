"""
SQLite-backed persistent store for marketplace listings.

Used automatically when Firestore is not configured (no service account JSON).
Data is stored in  backend/data/marketplace.db  and survives server restarts.

This replaces the in-memory _MEMORY_STORE dict in marketplace_service.py so
listings are durable with zero extra configuration.
"""

from datetime import datetime, timezone, timedelta
import json
import logging
import sqlite3
from pathlib import Path

logger = logging.getLogger(__name__)

# Store the DB next to the backend app, in a data/ subdirectory.
_DB_PATH = Path(__file__).resolve().parent.parent / "data" / "marketplace.db"


def _connect() -> sqlite3.Connection:
    _DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(_DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def _ensure_table(conn: sqlite3.Connection) -> None:
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS listings (
            id          TEXT PRIMARY KEY,
            status      TEXT NOT NULL DEFAULT 'active',
            data        TEXT NOT NULL
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS conversations (
            id          TEXT PRIMARY KEY,
            buyer_uid   TEXT NOT NULL,
            seller_uid  TEXT NOT NULL,
            listing_id  TEXT NOT NULL,
            data        TEXT NOT NULL
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS messages (
            id              TEXT PRIMARY KEY,
            conversation_id TEXT NOT NULL,
            created_at      TEXT NOT NULL,
            data            TEXT NOT NULL
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS devices (
            id          TEXT PRIMARY KEY,
            owner_uid   TEXT NOT NULL,
            created_at  TEXT NOT NULL,
            data        TEXT NOT NULL
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS reservations (
            id              TEXT PRIMARY KEY,
            listing_id      TEXT NOT NULL,
            part_id         TEXT,
            buyer_uid       TEXT NOT NULL,
            seller_uid      TEXT NOT NULL,
            status          TEXT NOT NULL,
            idempotency_key TEXT UNIQUE,
            created_at      TEXT NOT NULL,
            data            TEXT NOT NULL
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS reports (
            id          TEXT PRIMARY KEY,
            listing_id  TEXT NOT NULL,
            created_at  TEXT NOT NULL,
            data        TEXT NOT NULL
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS security_events (
            id          TEXT PRIMARY KEY,
            user_id     TEXT,
            email       TEXT,
            event_type  TEXT NOT NULL,
            ip_address  TEXT,
            timestamp   TEXT NOT NULL,
            data        TEXT NOT NULL
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS fraud_assessments (
            id              TEXT PRIMARY KEY,
            user_id         TEXT NOT NULL,
            user_email      TEXT,
            event_type      TEXT NOT NULL,
            entity_id       TEXT,
            anomaly_score   REAL NOT NULL,
            risk_level      TEXT NOT NULL,
            review_status   TEXT NOT NULL DEFAULT 'pending',
            created_at      TEXT NOT NULL,
            data            TEXT NOT NULL
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS admin_actions (
            id          TEXT PRIMARY KEY,
            admin_uid   TEXT NOT NULL,
            action_type TEXT NOT NULL,
            target_id   TEXT NOT NULL,
            created_at  TEXT NOT NULL,
            data        TEXT NOT NULL
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS user_restrictions (
            user_id         TEXT PRIMARY KEY,
            is_restricted   INTEGER NOT NULL DEFAULT 0,
            reason          TEXT,
            updated_at      TEXT NOT NULL,
            data            TEXT NOT NULL
        )
        """
    )
    conn.commit()


# Module-level connection (FastAPI runs single-process in dev).
_conn: sqlite3.Connection | None = None


def _get_conn() -> sqlite3.Connection:
    global _conn
    if _conn is None:
        _conn = _connect()
        _ensure_table(_conn)
        logger.info("[SQLite] Marketplace DB at %s", _DB_PATH)
    return _conn


def save(record: dict) -> None:
    conn = _get_conn()
    conn.execute(
        "INSERT OR REPLACE INTO listings (id, status, data) VALUES (?, ?, ?)",
        (record["id"], record["status"], json.dumps(record)),
    )
    conn.commit()


def get(listing_id: str) -> dict | None:
    conn = _get_conn()
    row = conn.execute(
        "SELECT data FROM listings WHERE id = ?", (listing_id,)
    ).fetchone()
    return json.loads(row["data"]) if row else None


def list_all(status: str = "active", limit: int = 200) -> list[dict]:
    conn = _get_conn()
    rows = conn.execute(
        "SELECT data FROM listings WHERE status = ? LIMIT ?", (status, limit)
    ).fetchall()
    return [json.loads(r["data"]) for r in rows]


def update_status(listing_id: str, new_status: str) -> None:
    conn = _get_conn()
    row = conn.execute(
        "SELECT data FROM listings WHERE id = ?", (listing_id,)
    ).fetchone()
    if row is None:
        return
    record = json.loads(row["data"])
    record["status"] = new_status
    conn.execute(
        "UPDATE listings SET status = ?, data = ? WHERE id = ?",
        (new_status, json.dumps(record), listing_id),
    )
    conn.commit()


def delete(listing_id: str) -> None:
    conn = _get_conn()
    conn.execute("DELETE FROM listings WHERE id = ?", (listing_id,))
    conn.commit()


# --- Messaging -----------------------------------------------------------

def save_conversation(record: dict) -> None:
    conn = _get_conn()
    conn.execute(
        "INSERT OR REPLACE INTO conversations (id, buyer_uid, seller_uid, listing_id, data) VALUES (?, ?, ?, ?, ?)",
        (record["id"], record["buyer_uid"], record["seller_uid"], record["listing_id"], json.dumps(record)),
    )
    conn.commit()

def get_conversation(conv_id: str) -> dict | None:
    conn = _get_conn()
    row = conn.execute("SELECT data FROM conversations WHERE id = ?", (conv_id,)).fetchone()
    return json.loads(row["data"]) if row else None

def get_conversation_by_users_and_listing(buyer_uid: str, seller_uid: str, listing_id: str) -> dict | None:
    conn = _get_conn()
    row = conn.execute(
        "SELECT data FROM conversations WHERE buyer_uid = ? AND seller_uid = ? AND listing_id = ?",
        (buyer_uid, seller_uid, listing_id)
    ).fetchone()
    return json.loads(row["data"]) if row else None

def list_user_conversations(uid: str) -> list[dict]:
    conn = _get_conn()
    rows = conn.execute(
        "SELECT data FROM conversations WHERE buyer_uid = ? OR seller_uid = ?", (uid, uid)
    ).fetchall()
    return [json.loads(r["data"]) for r in rows]

def save_message(record: dict) -> None:
    conn = _get_conn()
    conn.execute(
        "INSERT OR REPLACE INTO messages (id, conversation_id, created_at, data) VALUES (?, ?, ?, ?)",
        (record["id"], record["conversation_id"], record["created_at"], json.dumps(record)),
    )
    conn.commit()

def list_messages(conv_id: str) -> list[dict]:
    conn = _get_conn()
    rows = conn.execute(
        "SELECT data FROM messages WHERE conversation_id = ? ORDER BY created_at ASC", (conv_id,)
    ).fetchall()
    return [json.loads(r["data"]) for r in rows]


# --- Device Registration Store ---------------------------------------------

def save_device(record: dict) -> None:
    conn = _get_conn()
    conn.execute(
        "INSERT OR REPLACE INTO devices (id, owner_uid, created_at, data) VALUES (?, ?, ?, ?)",
        (record["id"], record["owner_uid"], record.get("created_at", ""), json.dumps(record)),
    )
    conn.commit()


def get_device(device_id: str) -> dict | None:
    conn = _get_conn()
    row = conn.execute("SELECT data FROM devices WHERE id = ?", (device_id,)).fetchone()
    return json.loads(row["data"]) if row else None


def list_user_devices(uid: str) -> list[dict]:
    conn = _get_conn()
    rows = conn.execute(
        "SELECT data FROM devices WHERE owner_uid = ? ORDER BY created_at DESC", (uid,)
    ).fetchall()
    return [json.loads(r["data"]) for r in rows]


# --- Reservations & Transaction Locking Store -----------------------------

def create_atomic_reservation(record: dict) -> dict:
    """
    Atomically creates a reservation and marks the listing/part reserved.
    Prevents race conditions (double selling) and honors idempotency keys.
    """
    conn = _get_conn()
    
    # 1. Idempotency Check
    existing_idem = conn.execute(
        "SELECT data FROM reservations WHERE idempotency_key = ?", (record["idempotency_key"],)
    ).fetchone()
    if existing_idem:
        return json.loads(existing_idem["data"])

    # Begin IMMEDIATE transaction for concurrency protection
    conn.execute("BEGIN IMMEDIATE TRANSACTION")
    try:
        # Check listing availability
        row = conn.execute("SELECT data, status FROM listings WHERE id = ?", (record["listing_id"],)).fetchone()
        if not row:
            raise ValueError("Listing not found")
        
        listing_status = row["status"]
        if listing_status != "active":
            raise ValueError(f"Listing is unavailable (current status: '{listing_status}')")

        listing_data = json.loads(row["data"])
        
        # Check if active reservation exists for listing or specific part
        existing_res = conn.execute(
            """
            SELECT id FROM reservations 
            WHERE listing_id = ? AND status = 'RESERVED'
            """,
            (record["listing_id"],)
        ).fetchone()

        if existing_res:
            raise ValueError("This component or device is already reserved by another buyer")

        # Save reservation
        conn.execute(
            """
            INSERT INTO reservations (id, listing_id, part_id, buyer_uid, seller_uid, status, idempotency_key, created_at, data)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                record["id"],
                record["listing_id"],
                record.get("part_id"),
                record["buyer_uid"],
                record["seller_uid"],
                record["status"],
                record["idempotency_key"],
                record["created_at"],
                json.dumps(record),
            )
        )

        # Update listing status to reserved
        listing_data["status"] = "reserved"
        conn.execute(
            "UPDATE listings SET status = 'reserved', data = ? WHERE id = ?",
            (json.dumps(listing_data), record["listing_id"])
        )

        conn.commit()
        return record
    except Exception:
        conn.rollback()
        raise


def get_reservation(res_id: str) -> dict | None:
    conn = _get_conn()
    row = conn.execute("SELECT data FROM reservations WHERE id = ?", (res_id,)).fetchone()
    return json.loads(row["data"]) if row else None


def list_user_reservations(uid: str) -> list[dict]:
    conn = _get_conn()
    rows = conn.execute(
        "SELECT data FROM reservations WHERE buyer_uid = ? OR seller_uid = ? ORDER BY created_at DESC",
        (uid, uid)
    ).fetchall()
    return [json.loads(r["data"]) for r in rows]


def update_reservation_status(res_id: str, new_status: str) -> dict | None:
    conn = _get_conn()
    conn.execute("BEGIN IMMEDIATE TRANSACTION")
    try:
        row = conn.execute("SELECT data FROM reservations WHERE id = ?", (res_id,)).fetchone()
        if not row:
            conn.rollback()
            return None
        
        res = json.loads(row["data"])
        res["status"] = new_status
        listing_id = res["listing_id"]

        conn.execute(
            "UPDATE reservations SET status = ?, data = ? WHERE id = ?",
            (new_status, json.dumps(res), res_id)
        )

        # Sync listing status
        if new_status == "SOLD":
            update_status(listing_id, "sold")
        elif new_status == "CANCELLED" or new_status == "EXPIRED":
            update_status(listing_id, "active")

        conn.commit()
        return res
    except Exception:
        conn.rollback()
        raise


# --- Moderation & Reports Store --------------------------------------------

def save_report(record: dict) -> None:
    conn = _get_conn()
    conn.execute(
        "INSERT INTO reports (id, listing_id, created_at, data) VALUES (?, ?, ?, ?)",
        (record["id"], record["listing_id"], record["created_at"], json.dumps(record))
    )
    conn.commit()


# --- Security & Fraud Detection Store -------------------------------------

def save_security_event(event: dict) -> None:
    conn = _get_conn()
    conn.execute(
        """
        INSERT INTO security_events (id, user_id, email, event_type, ip_address, timestamp, data)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (
            event["id"],
            event.get("user_id"),
            event.get("email"),
            event["event_type"],
            event.get("ip_address"),
            event["timestamp"],
            json.dumps(event),
        ),
    )
    conn.commit()


def list_security_events(
    user_id: str | None = None,
    email: str | None = None,
    event_type: str | None = None,
    limit: int = 100,
) -> list[dict]:
    conn = _get_conn()
    query = "SELECT data FROM security_events WHERE 1=1"
    params: list = []
    if user_id:
        query += " AND user_id = ?"
        params.append(user_id)
    if email:
        query += " AND email = ?"
        params.append(email.lower())
    if event_type:
        query += " AND event_type = ?"
        params.append(event_type)
    query += " ORDER BY timestamp DESC LIMIT ?"
    params.append(limit)

    rows = conn.execute(query, params).fetchall()
    return [json.loads(r["data"]) for r in rows]


def count_recent_security_events(
    event_type: str,
    user_id: str | None = None,
    email: str | None = None,
    ip_address: str | None = None,
    window_seconds: int = 600,
) -> int:
    conn = _get_conn()
    cutoff = (datetime.now(timezone.utc) - timedelta(seconds=window_seconds)).isoformat()
    query = "SELECT COUNT(*) as cnt FROM security_events WHERE event_type = ? AND timestamp >= ?"
    params: list = [event_type, cutoff]

    conditions = []
    if user_id:
        conditions.append("user_id = ?")
        params.append(user_id)
    if email:
        conditions.append("email = ?")
        params.append(email.lower())
    if ip_address:
        conditions.append("ip_address = ?")
        params.append(ip_address)

    if conditions:
        query += " AND (" + " OR ".join(conditions) + ")"

    row = conn.execute(query, params).fetchone()
    return int(row["cnt"]) if row else 0


def count_user_listings_since(user_id: str, window_seconds: int = 3600) -> int:
    conn = _get_conn()
    cutoff = (datetime.now(timezone.utc) - timedelta(seconds=window_seconds)).isoformat()
    # Find active listings created by this user since cutoff
    rows = conn.execute("SELECT data FROM listings").fetchall()
    cnt = 0
    for r in rows:
        d = json.loads(r["data"])
        if d.get("seller_uid") == user_id and d.get("created_at", "") >= cutoff:
            cnt += 1
    return cnt


def save_fraud_assessment(record: dict) -> None:
    conn = _get_conn()
    conn.execute(
        """
        INSERT OR REPLACE INTO fraud_assessments
        (id, user_id, user_email, event_type, entity_id, anomaly_score, risk_level, review_status, created_at, data)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            record["event_id"],
            record["user_id"],
            record.get("user_email"),
            record["event_type"],
            record.get("entity_id"),
            float(record["anomaly_score"]),
            record["risk_level"],
            record.get("review_status", "pending"),
            record["created_at"],
            json.dumps(record),
        ),
    )
    conn.commit()


def _enrich_assessment(record: dict, conn) -> dict:
    if not record or not isinstance(record, dict):
        return record
    entity_id = record.get("entity_id")
    event_type = record.get("event_type")

    # If already has device_name or listing_title, keep it
    if record.get("device_name") and record.get("listing_title"):
        return record

    if event_type == "listing_created" and entity_id:
        row = conn.execute("SELECT data FROM listings WHERE id = ?", (entity_id,)).fetchone()
        if row:
            try:
                ldata = json.loads(row["data"])
                title = ldata.get("title")
                brand = ldata.get("brand") or ""
                model = ldata.get("model_name") or ""
                dev_name = f"{brand} {model}".strip() if (brand or model) else (title or "Marketplace Device")
                record["listing_title"] = title
                record["device_name"] = dev_name
                record["device_type"] = ldata.get("device_type")
                record["brand"] = brand
                record["model_name"] = model
                if "observed_features" in record and isinstance(record["observed_features"], dict):
                    record["observed_features"]["listing_title"] = title
                    record["observed_features"]["device_name"] = dev_name
                    record["observed_features"]["device_type"] = ldata.get("device_type")
            except Exception:
                pass
    elif event_type == "match_request":
        obs = record.get("observed_features") or {}
        if obs.get("brand") or obs.get("model"):
            record["device_name"] = f"{obs.get('brand', '')} {obs.get('model', '')}".strip()
            record["device_type"] = obs.get("device_type")
    return record


def get_fraud_assessment(assessment_id: str) -> dict | None:
    conn = _get_conn()
    row = conn.execute(
        "SELECT data FROM fraud_assessments WHERE id = ?", (assessment_id,)
    ).fetchone()
    if not row:
        return None
    return _enrich_assessment(json.loads(row["data"]), conn)


def list_fraud_assessments(
    risk_level: str | None = None,
    event_type: str | None = None,
    review_status: str | None = None,
    search: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[dict], int]:
    conn = _get_conn()
    query = "SELECT data FROM fraud_assessments WHERE 1=1"
    count_query = "SELECT COUNT(*) as total FROM fraud_assessments WHERE 1=1"
    params: list = []

    if risk_level and risk_level != "all":
        query += " AND risk_level = ?"
        count_query += " AND risk_level = ?"
        params.append(risk_level)
    if event_type and event_type != "all":
        query += " AND event_type = ?"
        count_query += " AND event_type = ?"
        params.append(event_type)
    if review_status and review_status != "all":
        query += " AND review_status = ?"
        count_query += " AND review_status = ?"
        params.append(review_status)
    if search:
        search_like = f"%{search.strip().lower()}%"
        query += " AND (user_email LIKE ? OR user_id LIKE ? OR entity_id LIKE ?)"
        count_query += " AND (user_email LIKE ? OR user_id LIKE ? OR entity_id LIKE ?)"
        params.extend([search_like, search_like, search_like])

    total_row = conn.execute(count_query, params).fetchone()
    total = int(total_row["total"]) if total_row else 0

    query += " ORDER BY created_at DESC LIMIT ? OFFSET ?"
    list_params = params + [limit, offset]
    rows = conn.execute(query, list_params).fetchall()
    return [_enrich_assessment(json.loads(r["data"]), conn) for r in rows], total


def update_fraud_assessment_review(
    assessment_id: str,
    review_status: str,
    reviewer_id: str,
    review_notes: str | None = None,
) -> dict | None:
    conn = _get_conn()
    row = conn.execute(
        "SELECT data FROM fraud_assessments WHERE id = ?", (assessment_id,)
    ).fetchone()
    if not row:
        return None

    record = json.loads(row["data"])
    record["review_status"] = review_status
    record["reviewer_id"] = reviewer_id
    record["review_notes"] = review_notes
    record["reviewed_at"] = datetime.now(timezone.utc).isoformat()

    conn.execute(
        "UPDATE fraud_assessments SET review_status = ?, data = ? WHERE id = ?",
        (review_status, json.dumps(record), assessment_id),
    )
    conn.commit()
    return record


def delete_fraud_assessment(assessment_id: str) -> bool:
    """Deletes an assessment record from the database."""
    conn = _get_conn()
    cur = conn.execute("DELETE FROM fraud_assessments WHERE id = ?", (assessment_id,))
    conn.commit()
    return cur.rowcount > 0


def prune_fraud_assessments(target_count: int = 6) -> int:
    """
    Cleans up duplicate test and scraper artifacts, retaining exactly 5-6
    representative, distinct demonstration fraud and security events.
    """
    conn = _get_conn()
    # 1. Critical risk flagged listing
    crit_listing = conn.execute(
        "SELECT id FROM fraud_assessments WHERE risk_level = 'critical' AND event_type = 'listing_created' ORDER BY created_at DESC LIMIT 1"
    ).fetchone()

    # 2. High risk flagged listing (duplicate flood or outlier)
    high_listing = conn.execute(
        "SELECT id FROM fraud_assessments WHERE risk_level = 'high' AND event_type = 'listing_created' ORDER BY created_at DESC LIMIT 1"
    ).fetchone()

    # 3. Medium risk listing
    med_listing = conn.execute(
        "SELECT id FROM fraud_assessments WHERE risk_level = 'medium' AND event_type = 'listing_created' ORDER BY created_at DESC LIMIT 1"
    ).fetchone()

    # 4. High risk brute force login event
    auth_event = conn.execute(
        "SELECT id FROM fraud_assessments WHERE event_type = 'login_attempt' ORDER BY created_at DESC LIMIT 1"
    ).fetchone()

    # 5. Matching query velocity event
    match_event = conn.execute(
        "SELECT id FROM fraud_assessments WHERE event_type = 'match_request' ORDER BY created_at DESC LIMIT 1"
    ).fetchone()

    # 6. Low risk resolved listing
    low_event = conn.execute(
        "SELECT id FROM fraud_assessments WHERE risk_level = 'low' ORDER BY created_at DESC LIMIT 1"
    ).fetchone()

    keep_ids = set()
    for row in [crit_listing, high_listing, med_listing, auth_event, match_event, low_event]:
        if row:
            keep_ids.add(row["id"])

    # If we have fewer than target_count, backfill with most recent assessments
    if len(keep_ids) < target_count:
        extras = conn.execute(
            f"SELECT id FROM fraud_assessments ORDER BY created_at DESC LIMIT {target_count}"
        ).fetchall()
        for r in extras:
            keep_ids.add(r["id"])
            if len(keep_ids) >= target_count:
                break

    if keep_ids:
        placeholders = ",".join("?" for _ in keep_ids)
        conn.execute(
            f"DELETE FROM fraud_assessments WHERE id NOT IN ({placeholders})",
            list(keep_ids)
        )
        conn.commit()

    total = conn.execute("SELECT COUNT(*) as cnt FROM fraud_assessments").fetchone()["cnt"]
    return total



def get_fraud_summary_stats() -> dict:
    conn = _get_conn()
    total_assessments = conn.execute("SELECT COUNT(*) as cnt FROM fraud_assessments").fetchone()["cnt"]
    low = conn.execute("SELECT COUNT(*) as cnt FROM fraud_assessments WHERE risk_level = 'low'").fetchone()["cnt"]
    med = conn.execute("SELECT COUNT(*) as cnt FROM fraud_assessments WHERE risk_level = 'medium'").fetchone()["cnt"]
    high = conn.execute("SELECT COUNT(*) as cnt FROM fraud_assessments WHERE risk_level = 'high'").fetchone()["cnt"]
    critical = conn.execute("SELECT COUNT(*) as cnt FROM fraud_assessments WHERE risk_level = 'critical'").fetchone()["cnt"]
    pending = conn.execute("SELECT COUNT(*) as cnt FROM fraud_assessments WHERE review_status = 'pending'").fetchone()["cnt"]

    # Flagged listings count
    flagged = conn.execute("SELECT COUNT(*) as cnt FROM listings WHERE status = 'flagged'").fetchone()["cnt"]

    # Security events in last 24h
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
    sec_events = conn.execute(
        "SELECT COUNT(*) as cnt FROM security_events WHERE timestamp >= ?", (cutoff,)
    ).fetchone()["cnt"]

    return {
        "total_assessments": total_assessments,
        "low_risk_count": low,
        "medium_risk_count": med,
        "high_risk_count": high,
        "critical_risk_count": critical,
        "pending_review_count": pending,
        "flagged_listings_count": flagged,
        "security_events_24h": sec_events,
    }


def save_admin_action(record: dict) -> None:
    conn = _get_conn()
    conn.execute(
        """
        INSERT INTO admin_actions (id, admin_uid, action_type, target_id, created_at, data)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (
            record["id"],
            record["admin_uid"],
            record["action_type"],
            record["target_id"],
            record["created_at"],
            json.dumps(record),
        ),
    )
    conn.commit()


def set_user_restriction(user_id: str, is_restricted: bool, reason: str | None = None) -> dict:
    conn = _get_conn()
    now = datetime.now(timezone.utc).isoformat()
    record = {
        "user_id": user_id,
        "is_restricted": 1 if is_restricted else 0,
        "reason": reason or "",
        "updated_at": now,
    }
    conn.execute(
        """
        INSERT OR REPLACE INTO user_restrictions (user_id, is_restricted, reason, updated_at, data)
        VALUES (?, ?, ?, ?, ?)
        """,
        (user_id, 1 if is_restricted else 0, reason or "", now, json.dumps(record)),
    )
    conn.commit()
    return record


def is_user_restricted(user_id: str) -> bool:
    conn = _get_conn()
    row = conn.execute(
        "SELECT is_restricted FROM user_restrictions WHERE user_id = ?", (user_id,)
    ).fetchone()
    return bool(row["is_restricted"]) if row else False


def get_user_restriction(user_id: str) -> dict | None:
    conn = _get_conn()
    row = conn.execute(
        "SELECT data FROM user_restrictions WHERE user_id = ?", (user_id,)
    ).fetchone()
    return json.loads(row["data"]) if row else None


