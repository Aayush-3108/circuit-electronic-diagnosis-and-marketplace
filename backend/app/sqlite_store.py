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
