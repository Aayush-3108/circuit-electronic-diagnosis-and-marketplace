"""
SQLite-backed persistent store for marketplace listings.

Used automatically when Firestore is not configured (no service account JSON).
Data is stored in  backend/data/marketplace.db  and survives server restarts.

This replaces the in-memory _MEMORY_STORE dict in marketplace_service.py so
listings are durable with zero extra configuration.
"""

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


