# pyrefly: ignore [missing-import]
from fastapi import Depends, FastAPI, File, Form, HTTPException, UploadFile
# pyrefly: ignore [missing-import]
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.auth_deps import get_optional_user, require_user
from app.firebase_admin_client import firebase_status
from app.chatbot import get_chat_reply
from app.history_service import get_history, save_analysis
from app.marketplace_service import (
    create_listing,
    delete_listing,
    get_listing,
    list_listings,
    update_status,
)
from app.ml_service import decision_engine
from app.repair_shops import find_nearby_repair_shops
from app.schemas import (
    AnalyzeResponse,
    BrandTier,
    ChatRequest,
    ChatResponse,
    DeviceType,
    FunctionalStatus,
    HistoryEntry,
    ListingCreateRequest,
    ListingStatusUpdateRequest,
    MarketplaceListing,
    PartCategory,
    PartCondition,
    RepairShop,
    UpgradeAdviceRequest,
    UpgradeAdviceResponse,
    Conversation,
    ConversationCreateRequest,
    ConversationMessage,
    MessageCreateRequest,
)
from app import chat_service
from app.upgrade_advisor import get_upgrade_advice
from app.vision_service import detect_damage

app = FastAPI(
    title="Circuit API",
    description="AI-powered electronics marketplace: damage detection, "
    "sell/repair/recycle recommendations, upgrade advice, repair shop lookup.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    fb = firebase_status()
    return {
        "status": "ok",
        "firebase": fb,
        "storage_mode": "firestore" if fb["connected"] else "in-memory (data lost on restart)",
    }


@app.post("/api/analyze-device", response_model=AnalyzeResponse)
async def analyze_device(
    image: UploadFile = File(...),
    device_type: DeviceType = Form(...),
    brand_tier: BrandTier = Form("mid"),
    original_price_inr: float = Form(...),
    age_months: int = Form(...),
    battery_health_pct: int = Form(80),
    functional_status: FunctionalStatus = Form("fully_functional"),
    user: dict | None = Depends(get_optional_user),
):
    """
    Upload a photo of the device + basic metadata -> get damage detection,
    a sell/repair/recycle/upgrade recommendation, and cost/value estimates.

    Works with or without being signed in. If a valid Firebase ID token is
    sent (Authorization: Bearer <token>), the result is also saved to that
    user's history in Firestore -- otherwise it's just returned, not stored.
    """
    image_bytes = await image.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Empty image upload")

    detection = detect_damage(image_bytes)

    prediction = decision_engine.predict(
        device_type=device_type,
        brand_tier=brand_tier,
        damage_type=detection.damage_type,
        functional_status=functional_status,
        original_price_inr=original_price_inr,
        age_months=age_months,
        battery_health_pct=battery_health_pct,
        damage_severity=detection.damage_severity,
    )

    explanation = (
        f"Detected '{detection.damage_type}' damage "
        f"({'live YOLO model' if detection.source in ('yolo_model', 'yolo_local') else 'demo mode — CV model not yet active'}). "
        f"Based on device age ({age_months} mo), battery health ({battery_health_pct}%), "
        f"and estimated repair cost vs. resale value, the recommended action is "
        f"'{prediction['recommendation']}'."
    )

    response = AnalyzeResponse(
        detection=detection,
        recommendation=prediction["recommendation"],
        recommendation_confidence=prediction["recommendation_confidence"],
        estimated_repair_cost_inr=prediction["estimated_repair_cost_inr"],
        estimated_resale_value_inr=prediction["estimated_resale_value_inr"],
        explanation=explanation,
    )

    if user is not None:
        save_analysis(
            user["uid"],
            {
                "device_type": device_type,
                "recommendation": prediction["recommendation"],
                "estimated_repair_cost_inr": prediction["estimated_repair_cost_inr"],
                "estimated_resale_value_inr": prediction["estimated_resale_value_inr"],
                "damage_type": detection.damage_type,
            },
        )

    return response


@app.post("/api/upgrade-advice", response_model=UpgradeAdviceResponse)
def upgrade_advice(req: UpgradeAdviceRequest):
    advice = get_upgrade_advice(
        device_type=req.device_type,
        current_specs=req.current_specs,
        budget_inr=req.budget_inr,
        use_case=req.use_case,
    )
    return UpgradeAdviceResponse(advice=advice)


from app.forecasting_service import forecasting_service

@app.get("/api/repair-shops", response_model=list[RepairShop])
def repair_shops(lat: float, lng: float, radius_km: float = 5.0):
    return find_nearby_repair_shops(lat, lng, radius_km)

@app.get("/api/demand-forecast")
def demand_forecast():
    """Returns the demand forecast for various electronic parts."""
    return forecasting_service.get_forecast()


@app.post("/api/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    """
    Simple stateless chat endpoint -- the frontend keeps the running
    conversation and sends the full message list each turn.
    """
    messages = [{"role": m.role, "content": m.content} for m in req.messages]
    reply = get_chat_reply(messages)
    return ChatResponse(reply=reply)


@app.get("/api/history", response_model=list[HistoryEntry])
def history(user: dict = Depends(require_user)):
    """Signed-in users only -- returns their past device analyses."""
    return get_history(user["uid"])


# --- Marketplace -----------------------------------------------------------

@app.post("/api/marketplace/listings", response_model=MarketplaceListing)
def create_marketplace_listing(
    req: ListingCreateRequest, user: dict = Depends(require_user)
):
    """
    Create a listing -- either the whole device, or a set of individual parts
    (e.g. after a 'repair' or 'recycle' recommendation, a user can list just
    the still-good parts instead of scrapping the whole device).
    Images must already be uploaded (e.g. to Firebase Storage from the
    frontend) and passed here as URLs.
    """
    if req.listing_type == "whole_device" and (req.price_inr is None or not req.images):
        raise HTTPException(
            status_code=400,
            detail="Whole-device listings require price_inr and at least one image.",
        )
    if req.listing_type == "parts" and not req.parts:
        raise HTTPException(
            status_code=400, detail="Parts listings require at least one part."
        )
    return create_listing(user["uid"], user.get("email"), req)


@app.get("/api/marketplace/listings", response_model=list[MarketplaceListing])
def browse_marketplace_listings(
    device_type: DeviceType | None = None,
    listing_type: str | None = None,
    category: PartCategory | None = None,
    condition: PartCondition | None = None,
    min_price: float | None = None,
    max_price: float | None = None,
    search: str | None = None,
):
    """Public browse endpoint -- no auth required."""
    return list_listings(
        device_type=device_type,
        listing_type=listing_type,
        category=category,
        condition=condition,
        min_price=min_price,
        max_price=max_price,
        search=search,
    )


@app.get("/api/marketplace/listings/{listing_id}", response_model=MarketplaceListing)
def get_marketplace_listing(listing_id: str):
    listing = get_listing(listing_id)
    if listing is None:
        raise HTTPException(status_code=404, detail="Listing not found.")
    return listing


@app.patch("/api/marketplace/listings/{listing_id}/status", response_model=MarketplaceListing)
def update_marketplace_listing_status(
    listing_id: str, req: ListingStatusUpdateRequest, user: dict = Depends(require_user)
):
    try:
        listing = update_status(listing_id, user["uid"], req.status)
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    if listing is None:
        raise HTTPException(status_code=404, detail="Listing not found.")
    return listing


@app.delete("/api/marketplace/listings/{listing_id}")
def delete_marketplace_listing(listing_id: str, user: dict = Depends(require_user)):
    try:
        deleted = delete_listing(listing_id, user["uid"])
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    if not deleted:
        raise HTTPException(status_code=404, detail="Listing not found.")
    return {"deleted": True}

from app.part_matching_service import part_matching_service

@app.get("/api/marketplace/matches")
def get_part_matches(device_type: str, brand: str, model_name: str, needed_part_category: str):
    """Find complementary broken devices or parts that can supply a needed component."""
    return {"matches": part_matching_service.find_matches(device_type, brand, model_name, needed_part_category)}

# --- Messaging -------------------------------------------------------------

@app.post("/api/conversations", response_model=Conversation)
def create_or_get_conversation(req: ConversationCreateRequest, user: dict = Depends(require_user)):
    listing = get_listing(req.listing_id)
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
        
    title = listing.title
    image = ""
    if listing.listing_type == "whole_device" and listing.images:
        image = listing.images[0]
    elif listing.listing_type == "parts" and listing.parts and listing.parts[0].images:
        image = listing.parts[0].images[0]
        
    return chat_service.get_or_create_conversation(user["uid"], req.seller_uid, req.listing_id, title, image)

@app.get("/api/conversations", response_model=list[Conversation])
def get_conversations(user: dict = Depends(require_user)):
    return chat_service.get_user_conversations(user["uid"])

@app.get("/api/conversations/{conversation_id}/messages", response_model=list[ConversationMessage])
def get_conversation_messages(conversation_id: str, user: dict = Depends(require_user)):
    conv = chat_service.get_conversation(conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    if conv.buyer_uid != user["uid"] and conv.seller_uid != user["uid"]:
        raise HTTPException(status_code=403, detail="Not a participant in this conversation")
    
    return chat_service.list_messages(conversation_id)

@app.post("/api/conversations/{conversation_id}/messages", response_model=ConversationMessage)
def create_message(conversation_id: str, req: MessageCreateRequest, user: dict = Depends(require_user)):
    conv = chat_service.get_conversation(conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    if conv.buyer_uid != user["uid"] and conv.seller_uid != user["uid"]:
        raise HTTPException(status_code=403, detail="Not a participant in this conversation")
        
    return chat_service.send_message(conversation_id, user["uid"], req.text)

