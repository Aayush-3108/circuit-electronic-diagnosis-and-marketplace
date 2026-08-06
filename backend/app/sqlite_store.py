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

