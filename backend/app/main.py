from typing import Optional
from fastapi import Depends, FastAPI, File, Form, HTTPException, UploadFile
# pyrefly: ignore [missing-import]
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.auth_deps import get_optional_user, require_user, require_admin, is_admin_user
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
    HistoryCreateRequest,
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
    RegisteredDevice,
    DeviceRegistrationRequest,
    CompatibilityEvaluationRequest,
    CompatibilityEvaluationResponse,
    ComponentSearchRequest,
    MatchCandidate,
    ReservationCreateRequest,
    Reservation,
    ListingReportRequest,
    FraudAssessment,
    FraudReviewActionRequest,
    FraudSummaryMetrics,
    LoginAttemptRequest,
    LoginAttemptResponse,
    LoginResultRequest,
    UserRestrictionRequest,
)
from app import chat_service
from app.upgrade_advisor import get_upgrade_advice
from app.vision_service import detect_damage
from app.fraud_service import fraud_service
from app.security_service import security_service
from app import sqlite_store

app = FastAPI(
    title="Circuit API",
    description="AI-powered electronics marketplace: damage detection, "
    "sell/repair/recycle recommendations, upgrade advice, repair shop lookup.",
    version="0.1.0",
)

# Configure CORS to safely support both specific domains and wildcard/Vercel domains
configured_origins = (
    settings.allowed_origins
    if isinstance(settings.allowed_origins, list)
    else [settings.allowed_origins]
)

if "*" in configured_origins or "all" in configured_origins:
    cors_origin_regex = r".*"
    cors_origins = []
else:
    # Always allow any Vercel deployment preview or production domain automatically
    cors_origin_regex = r"^https:\/\/.*\.vercel\.app$"
    cors_origins = [o for o in configured_origins if o != "*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_origin_regex=cors_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    """Root status check endpoint."""
    return {
        "status": "online",
        "service": "ReCircuit API",
        "docs": "/docs",
        "health": "/api/health",
    }


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

    saved_entry = None
    if user is not None:
        saved_entry = save_analysis(
            user["uid"],
            {
                "device_type": str(getattr(device_type, "value", device_type)),
                "recommendation": str(getattr(prediction["recommendation"], "value", prediction["recommendation"])),
                "estimated_repair_cost_inr": float(prediction["estimated_repair_cost_inr"]),
                "estimated_resale_value_inr": float(prediction["estimated_resale_value_inr"]),
                "damage_type": str(getattr(detection.damage_type, "value", detection.damage_type)),
            },
        )

    response = AnalyzeResponse(
        detection=detection,
        recommendation=prediction["recommendation"],
        recommendation_confidence=prediction["recommendation_confidence"],
        estimated_repair_cost_inr=prediction["estimated_repair_cost_inr"],
        estimated_resale_value_inr=prediction["estimated_resale_value_inr"],
        explanation=explanation,
        id=saved_entry.get("id") if saved_entry else None,
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


@app.post("/api/history", response_model=HistoryEntry)
def add_to_history(req: HistoryCreateRequest, user: dict = Depends(require_user)):
    """Signed-in users can manually save or sync an analysis to their history."""
    record = save_analysis(
        user["uid"],
        {
            "device_type": str(getattr(req.device_type, "value", req.device_type)),
            "recommendation": str(getattr(req.recommendation, "value", req.recommendation)),
            "estimated_repair_cost_inr": float(req.estimated_repair_cost_inr),
            "estimated_resale_value_inr": float(req.estimated_resale_value_inr),
            "damage_type": str(getattr(req.damage_type, "value", req.damage_type)),
        },
    )
    return HistoryEntry(**record)


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
        user_is_admin = is_admin_user(user.get("email"))
        deleted = delete_listing(listing_id, user["uid"], is_admin=user_is_admin)
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    if not deleted:
        raise HTTPException(status_code=404, detail="Listing not found.")
    return {"deleted": True}

from app.part_matching_service import part_matching_service
from app.compatibility_engine import compatibility_engine
from app import agent_suite
from app import sqlite_store
import uuid
import datetime

@app.get("/api/marketplace/matches")
def get_part_matches(
    device_type: str,
    brand: str,
    model_name: str,
    needed_part_category: str,
    user: dict | None = Depends(get_optional_user),
):
    """Find complementary broken devices or parts that can supply a needed component."""
    # Monitor component matching query velocity for anomaly detection
    user_id = user["uid"] if user else "anon_matcher"
    fraud_service.evaluate_matching_activity(
        user_id=user_id,
        device_type=device_type,
        brand=brand,
        model_name=model_name,
        needed_part_category=needed_part_category,
    )

    # Use matching_ranking_agent for evidence-based candidate scoring
    all_listings = list_listings(status="active", limit=1000)
    raw_listings_dicts = [l.model_dump() if hasattr(l, "model_dump") else dict(l) for l in all_listings]
    
    candidates = agent_suite.matching_ranking_agent.rank_candidates(
        target_device_type=device_type,
        target_brand=brand,
        target_model_name=model_name,
        needed_category=needed_part_category,
        active_listings=raw_listings_dicts,
    )
    
    # Return formatted list matching both legacy schema and enriched candidate models
    legacy_format = []
    for c in candidates:
        legacy_format.append({
            "listing_id": c.listing_id,
            "part_id": c.part_id,
            "type": c.type,
            "title": c.title,
            "price": c.price_inr,
            "total_estimated_cost_inr": c.total_estimated_cost_inr,
            "condition": c.condition,
            "verification_level": c.verification_level,
            "compatibility_outcome": c.compatibility_outcome,
            "compatibility_score": c.compatibility_score,
            "explanation": c.explanation,
            "matched_specs": c.matched_specs,
            "unverified_specs": c.unverified_specs,
            "seller_id": c.seller_uid,
            "image_url": c.image_url,
            "compatible_with": c.model_name
        })
    return {"matches": legacy_format}


# --- Component Reuse System Endpoints -------------------------------------

@app.post("/api/devices", response_model=RegisteredDevice)
def register_device(req: DeviceRegistrationRequest, user: dict = Depends(require_user)):
    """Register a user device with model specs and ownership declaration."""
    device_id = f"dev_{uuid.uuid4().hex[:10]}"
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    
    record = {
        "id": device_id,
        "owner_uid": user["uid"],
        "brand": req.brand,
        "model_family": req.brand,
        "model_name": req.model_name,
        "exact_model_number": req.exact_model_number,
        "variant_region": req.variant_region,
        "device_type": req.device_type,
        "condition": req.condition,
        "purchase_year": req.purchase_year,
        "ownership_declared": req.ownership_declared,
        "created_at": now,
        "diagnostic_reports": [{"summary": req.diagnostic_summary, "timestamp": now}] if req.diagnostic_summary else []
    }
    sqlite_store.save_device(record)
    return RegisteredDevice(**record)


@app.get("/api/devices", response_model=list[RegisteredDevice])
def list_user_devices(user: dict = Depends(require_user)):
    """List authenticated user's registered devices."""
    records = sqlite_store.list_user_devices(user["uid"])
    return [RegisteredDevice(**r) for r in records]


@app.post("/api/marketplace/evaluate-compatibility", response_model=CompatibilityEvaluationResponse)
def evaluate_compatibility(req: CompatibilityEvaluationRequest):
    """Directly evaluate technical compatibility between target device and component."""
    return compatibility_engine.evaluate(
        target_device_type=req.target_device_type,
        target_brand=req.target_brand,
        target_model_name=req.target_model_name,
        needed_category=req.needed_part_category,
        target_exact_model=req.target_exact_model,
        target_variant=req.target_variant,
    )


@app.post("/api/marketplace/compatible-components", response_model=list[MatchCandidate])
def search_compatible_components(
    req: ComponentSearchRequest,
    user: dict | None = Depends(get_optional_user),
):
    """Rank all active candidate components using AI matching agent + hard compatibility engine."""
    user_id = user["uid"] if user else "anon_matcher"
    fraud_service.evaluate_matching_activity(
        user_id=user_id,
        device_type=req.device_type,
        brand=req.brand,
        model_name=req.model_name,
        needed_part_category=req.needed_part_category,
    )

    all_listings = list_listings(status="active", limit=1000)
    raw_dicts = [l.model_dump() if hasattr(l, "model_dump") else dict(l) for l in all_listings]
    
    return agent_suite.matching_ranking_agent.rank_candidates(
        target_device_type=req.device_type,
        target_brand=req.brand,
        target_model_name=req.model_name,
        needed_category=req.needed_part_category,
        active_listings=raw_dicts,
        target_exact_model=req.exact_model_number,
        max_price_inr=req.max_price_inr,
    )


@app.post("/api/reservations", response_model=Reservation)
def create_reservation(req: ReservationCreateRequest, user: dict = Depends(require_user)):
    """
    Atomically reserve a component or donor device.
    Uses SQLite database transaction locks & idempotency protection to prevent race conditions.
    """
    listing = get_listing(req.listing_id)
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
        
    if listing.seller_uid == user["uid"]:
        raise HTTPException(status_code=400, detail="Sellers cannot reserve their own listing")
        
    res_id = f"res_{uuid.uuid4().hex[:10]}"
    now = datetime.datetime.now(datetime.timezone.utc)
    expires = (now + datetime.timedelta(days=2)).isoformat()
    
    record = {
        "id": res_id,
        "listing_id": req.listing_id,
        "part_id": req.part_id,
        "buyer_uid": user["uid"],
        "seller_uid": listing.seller_uid,
        "status": "RESERVED",
        "created_at": now.isoformat(),
        "expires_at": expires,
        "idempotency_key": req.idempotency_key,
        "buyer_notes": req.buyer_notes,
    }
    
    try:
        saved = sqlite_store.create_atomic_reservation(record)
        return Reservation(**saved)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))


@app.get("/api/reservations", response_model=list[Reservation])
def get_user_reservations(user: dict = Depends(require_user)):
    """List authenticated user's active/past reservations."""
    records = sqlite_store.list_user_reservations(user["uid"])
    return [Reservation(**r) for r in records]


@app.patch("/api/reservations/{res_id}/status", response_model=Reservation)
def update_reservation_status(res_id: str, status: str = Form(...), user: dict = Depends(require_user)):
    """Update reservation state (e.g., mark SOLD or CANCELLED)."""
    res = sqlite_store.get_reservation(res_id)
    if not res:
        raise HTTPException(status_code=404, detail="Reservation not found")
        
    if user["uid"] not in [res["buyer_uid"], res["seller_uid"]]:
        raise HTTPException(status_code=403, detail="Not authorized to update this reservation")
        
    updated = sqlite_store.update_reservation_status(res_id, status)
    return Reservation(**updated)


@app.post("/api/marketplace/listings/{listing_id}/report")
def report_listing(listing_id: str, req: ListingReportRequest, user: dict = Depends(require_user)):
    """Submit a moderation report for a suspicious or unsafe component listing."""
    listing = get_listing(listing_id)
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
        
    report_id = f"rep_{uuid.uuid4().hex[:10]}"
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    record = {
        "id": report_id,
        "listing_id": listing_id,
        "reporter_uid": user["uid"],
        "reason": req.reason,
        "details": req.details,
        "created_at": now,
    }
    sqlite_store.save_report(record)
    return {"reported": True, "report_id": report_id}


@app.post("/api/value-comparison")
def compare_component_value(part_cost_inr: float = Form(...), original_price_inr: float = Form(30000.0), pro_repair_inr: float = Form(5000.0)):
    """Run Value & Repair Comparison Agent."""
    return agent_suite.value_comparison_agent.compare_options(
        part_cost_inr=part_cost_inr,
        device_original_price_inr=original_price_inr,
        estimated_pro_repair_inr=pro_repair_inr
    )


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


# --- Authentication Security & Rate Limiting ------------------------------

@app.post("/api/security/login-attempt", response_model=LoginAttemptResponse)
def check_login_attempt(req: LoginAttemptRequest):
    """
    Checks whether a login attempt is permitted or currently in rate-limit cooldown.
    Does not leak whether the account exists.
    """
    res = security_service.record_login_attempt(email=req.email)
    return LoginAttemptResponse(**res)


@app.post("/api/security/login-result")
def record_login_result(req: LoginResultRequest, user: dict | None = Depends(get_optional_user)):
    """
    Records the outcome of a login attempt (success or failure) and evaluates brute-force patterns.
    """
    uid = user["uid"] if user else None
    security_service.record_login_result(
        email=req.email,
        success=req.success,
        user_id=uid,
        error_code=req.error_code,
    )
    return {"status": "ok"}


@app.get("/api/security/me")
def get_security_profile(user: dict | None = Depends(get_optional_user)):
    """
    Returns user security profile, admin status, and restriction flag.
    """
    if not user:
        return {"authenticated": False, "is_admin": False, "is_restricted": False}

    is_admin = is_admin_user(user)
    is_restr = sqlite_store.is_user_restricted(user["uid"])
    return {
        "authenticated": True,
        "uid": user["uid"],
        "email": user.get("email"),
        "is_admin": is_admin,
        "is_restricted": is_restr,
    }


# --- Fraud Detection & Admin Monitoring Endpoints -------------------------

@app.get("/api/fraud/health")
def fraud_health():
    """Returns model health, version, and training status."""
    return fraud_service.get_health_status()


@app.get("/api/fraud/admin/summary", response_model=FraudSummaryMetrics)
def fraud_admin_summary(admin: dict = Depends(require_admin)):
    """Returns aggregated summary metrics for the admin fraud dashboard."""
    return fraud_service.get_admin_summary()


@app.get("/api/fraud/admin/assessments")
def list_fraud_assessments(
    risk_level: Optional[str] = None,
    event_type: Optional[str] = None,
    review_status: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    admin: dict = Depends(require_admin),
):
    """Lists paginated fraud assessments with optional filters."""
    items, total = fraud_service.list_assessments(
        risk_level=risk_level,
        event_type=event_type,
        review_status=review_status,
        search=search,
        limit=limit,
        offset=offset,
    )
    return {"assessments": items, "total": total, "limit": limit, "offset": offset}


@app.get("/api/fraud/admin/assessments/{assessment_id}", response_model=FraudAssessment)
def get_fraud_assessment_detail(assessment_id: str, admin: dict = Depends(require_admin)):
    """Fetch complete details of a specific fraud assessment."""
    assessment = fraud_service.get_assessment(assessment_id)
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    return FraudAssessment(**assessment)


@app.patch("/api/fraud/admin/assessments/{assessment_id}/review", response_model=FraudAssessment)
def review_fraud_assessment(
    assessment_id: str,
    req: FraudReviewActionRequest,
    admin: dict = Depends(require_admin),
):
    """
    Authorized administrator reviews an assessment (reviewed, false_positive, confirmed_fraud, resolved).
    Audits the decision without overwriting the Isolation Forest score.
    """
    updated = fraud_service.review_assessment(
        assessment_id=assessment_id,
        review_status=req.review_status,
        reviewer_id=admin["uid"],
        review_notes=req.review_notes,
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Assessment not found")
    return FraudAssessment(**updated)


@app.patch("/api/fraud/admin/users/{user_id}/restriction")
def update_user_restriction(
    user_id: str,
    req: UserRestrictionRequest,
    admin: dict = Depends(require_admin),
):
    """Temporarily restrict or restore an account after fraud investigation."""
    record = sqlite_store.set_user_restriction(
        user_id=user_id,
        is_restricted=req.is_restricted,
        reason=req.reason,
    )
    # Log admin action audit trail
    import uuid as _uuid
    import datetime as _dt
    sqlite_store.save_admin_action({
        "id": f"act_{_uuid.uuid4().hex[:12]}",
        "admin_uid": admin["uid"],
        "action_type": "restrict_user" if req.is_restricted else "unrestrict_user",
        "target_id": user_id,
        "created_at": _dt.datetime.now(_dt.timezone.utc).isoformat(),
        "reason": req.reason,
    })
    return {"status": "ok", "user_id": user_id, "is_restricted": req.is_restricted}


@app.delete("/api/fraud/admin/listings/{listing_id}")
def admin_delete_fraud_listing(listing_id: str, admin: dict = Depends(require_admin)):
    """Allows an authorized administrator to purge or delete a confirmed fraudulent listing with an audit record."""
    deleted = delete_listing(listing_id, requester_uid=admin["uid"], is_admin=True)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Listing '{listing_id}' not found or already removed from marketplace.")
    import uuid as _uuid
    import datetime as _dt
    sqlite_store.save_admin_action({
        "id": f"act_{_uuid.uuid4().hex[:12]}",
        "admin_uid": admin["uid"],
        "action_type": "delete_fraud_listing",
        "target_id": listing_id,
        "created_at": _dt.datetime.now(_dt.timezone.utc).isoformat(),
        "reason": "Confirmed fraudulent listing deletion by administrator",
    })
    return {"deleted": True, "listing_id": listing_id}


@app.delete("/api/fraud/admin/assessments/{assessment_id}")
def admin_delete_fraud_assessment(assessment_id: str, admin: dict = Depends(require_admin)):
    """Allows an administrator to delete or dismiss an assessment record."""
    deleted = sqlite_store.delete_fraud_assessment(assessment_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Assessment record not found.")
    import uuid as _uuid
    import datetime as _dt
    sqlite_store.save_admin_action({
        "id": f"act_{_uuid.uuid4().hex[:12]}",
        "admin_uid": admin["uid"],
        "action_type": "delete_assessment",
        "target_id": assessment_id,
        "created_at": _dt.datetime.now(_dt.timezone.utc).isoformat(),
        "reason": "Dismissed/deleted by administrator",
    })
    return {"deleted": True, "assessment_id": assessment_id}


@app.post("/api/fraud/admin/prune-events")
def admin_prune_fraud_events(admin: dict = Depends(require_admin)):
    """Cleans up duplicate test events and prunes assessments down to 5-6 clean, realistic events."""
    count = sqlite_store.prune_fraud_assessments(target_count=6)
    return {"status": "ok", "remaining_count": count}




