"""
Marketplace listings service.

Storage priority:
  1. Firestore  -- used when firebase-service-account.json is configured.
  2. SQLite     -- used otherwise; data saved to backend/data/marketplace.db
                   and persists across server restarts with zero configuration.
"""

import uuid
from datetime import datetime, timezone

from app.firebase_admin_client import get_firestore
from app import sqlite_store
from app.schemas import ListingCreateRequest, MarketplaceListing

COLLECTION = "listings"


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def create_listing(seller_uid: str, seller_email: str | None, req: ListingCreateRequest) -> MarketplaceListing:
    listing_id = str(uuid.uuid4())
    record = {
        "id": listing_id,
        "seller_uid": seller_uid,
        "seller_email": seller_email,
        "created_at": _now_iso(),
        "status": "active",
        **req.model_dump(),
    }

    db = get_firestore()
    if db is not None:
        db.collection(COLLECTION).document(listing_id).set(record)
    else:
        sqlite_store.save(record)

    return MarketplaceListing(**record)


def get_listing(listing_id: str) -> MarketplaceListing | None:
    db = get_firestore()
    if db is not None:
        doc = db.collection(COLLECTION).document(listing_id).get()
        if not doc.exists:
            return None
        return MarketplaceListing(**doc.to_dict())

    record = sqlite_store.get(listing_id)
    return MarketplaceListing(**record) if record else None


def list_listings(
    device_type: str | None = None,
    listing_type: str | None = None,
    category: str | None = None,
    condition: str | None = None,
    min_price: float | None = None,
    max_price: float | None = None,
    search: str | None = None,
    status: str = "active",
    limit: int = 200,
) -> list[MarketplaceListing]:
    db = get_firestore()
    if db is not None:
        docs = (
            db.collection(COLLECTION)
            .where("status", "==", status)
            .limit(limit)
            .stream()
        )
        raw = [doc.to_dict() for doc in docs]
    else:
        raw = sqlite_store.list_all(status=status, limit=limit)

    results = [MarketplaceListing(**r) for r in raw]

    if device_type:
        results = [r for r in results if r.device_type == device_type]
    if listing_type:
        results = [r for r in results if r.listing_type == listing_type]
    if search:
        s = search.lower()
        results = [
            r for r in results
            if s in r.title.lower() or s in r.brand.lower() or s in r.model_name.lower()
        ]

    if category or condition or min_price is not None or max_price is not None:
        filtered = []
        for r in results:
            if r.listing_type == "whole_device":
                if category:
                    continue
                if condition and r.condition != condition:
                    continue
                if min_price is not None and (r.price_inr or 0) < min_price:
                    continue
                if max_price is not None and (r.price_inr or 0) > max_price:
                    continue
                filtered.append(r)
            else:
                matching_parts = [
                    p for p in r.parts
                    if (not category or p.category == category)
                    and (not condition or p.condition == condition)
                    and (min_price is None or p.price_inr >= min_price)
                    and (max_price is None or p.price_inr <= max_price)
                ]
                if matching_parts:
                    filtered.append(r)
        results = filtered

    results.sort(key=lambda r: r.created_at, reverse=True)
    return results


def update_status(listing_id: str, requester_uid: str, new_status: str) -> MarketplaceListing | None:
    listing = get_listing(listing_id)
    if listing is None:
        return None
    if listing.seller_uid != requester_uid:
        raise PermissionError("Only the seller can update this listing.")

    db = get_firestore()
    if db is not None:
        db.collection(COLLECTION).document(listing_id).update({"status": new_status})
    else:
        sqlite_store.update_status(listing_id, new_status)

    listing.status = new_status
    return listing


def delete_listing(listing_id: str, requester_uid: str) -> bool:
    listing = get_listing(listing_id)
    if listing is None:
        return False
    if listing.seller_uid != requester_uid:
        raise PermissionError("Only the seller can delete this listing.")

    db = get_firestore()
    if db is not None:
        db.collection(COLLECTION).document(listing_id).delete()
    else:
        sqlite_store.delete(listing_id)
    return True
