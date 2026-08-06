import uuid
from datetime import datetime, timezone

from app.firebase_admin_client import get_firestore
from app import sqlite_store
from app.schemas import Conversation, ConversationMessage

def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

def get_or_create_conversation(buyer_uid: str, seller_uid: str, listing_id: str, listing_title: str, listing_image: str) -> Conversation:
    db = get_firestore()
    if db is not None:
        # Check if conversation already exists
        docs = db.collection("conversations").where("buyer_uid", "==", buyer_uid).where("seller_uid", "==", seller_uid).where("listing_id", "==", listing_id).stream()
        for doc in docs:
            return Conversation(**doc.to_dict())
        
        # Create new
        conv_id = str(uuid.uuid4())
        record = {
            "id": conv_id,
            "listing_id": listing_id,
            "buyer_uid": buyer_uid,
            "seller_uid": seller_uid,
            "created_at": _now_iso(),
            "last_message_at": _now_iso(),
            "last_message_text": None,
            "listing_title": listing_title,
            "listing_image": listing_image,
        }
        db.collection("conversations").document(conv_id).set(record)
        return Conversation(**record)
    else:
        existing = sqlite_store.get_conversation_by_users_and_listing(buyer_uid, seller_uid, listing_id)
        if existing:
            return Conversation(**existing)
        
        conv_id = str(uuid.uuid4())
        record = {
            "id": conv_id,
            "listing_id": listing_id,
            "buyer_uid": buyer_uid,
            "seller_uid": seller_uid,
            "created_at": _now_iso(),
            "last_message_at": _now_iso(),
            "last_message_text": None,
            "listing_title": listing_title,
            "listing_image": listing_image,
        }
        sqlite_store.save_conversation(record)
        return Conversation(**record)

def get_user_conversations(uid: str) -> list[Conversation]:
    db = get_firestore()
    if db is not None:
        buyer_docs = list(db.collection("conversations").where("buyer_uid", "==", uid).stream())
        seller_docs = list(db.collection("conversations").where("seller_uid", "==", uid).stream())
        raw = [doc.to_dict() for doc in buyer_docs] + [doc.to_dict() for doc in seller_docs]
    else:
        raw = sqlite_store.list_user_conversations(uid)
    
    # Sort by last message descending
    raw.sort(key=lambda x: x.get("last_message_at", ""), reverse=True)
    return [Conversation(**r) for r in raw]

def get_conversation(conv_id: str) -> Conversation | None:
    db = get_firestore()
    if db is not None:
        doc = db.collection("conversations").document(conv_id).get()
        return Conversation(**doc.to_dict()) if doc.exists else None
    else:
        rec = sqlite_store.get_conversation(conv_id)
        return Conversation(**rec) if rec else None

def send_message(conv_id: str, sender_uid: str, text: str) -> ConversationMessage:
    msg_id = str(uuid.uuid4())
    now = _now_iso()
    record = {
        "id": msg_id,
        "conversation_id": conv_id,
        "sender_uid": sender_uid,
        "text": text,
        "created_at": now,
    }

    db = get_firestore()
    if db is not None:
        db.collection("messages").document(msg_id).set(record)
        db.collection("conversations").document(conv_id).update({
            "last_message_at": now,
            "last_message_text": text
        })
    else:
        sqlite_store.save_message(record)
        conv = sqlite_store.get_conversation(conv_id)
        if conv:
            conv["last_message_at"] = now
            conv["last_message_text"] = text
            sqlite_store.save_conversation(conv)
            
    return ConversationMessage(**record)

def list_messages(conv_id: str) -> list[ConversationMessage]:
    db = get_firestore()
    if db is not None:
        docs = db.collection("messages").where("conversation_id", "==", conv_id).order_by("created_at").stream()
        return [ConversationMessage(**doc.to_dict()) for doc in docs]
    else:
        return [ConversationMessage(**m) for m in sqlite_store.list_messages(conv_id)]
