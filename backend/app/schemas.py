from typing import Literal, Optional

# pyrefly: ignore [missing-import]
from pydantic import BaseModel, Field

DeviceType = Literal["phone", "laptop", "tablet", "pc", "monitor"]
BrandTier = Literal["budget", "mid", "premium"]
FunctionalStatus = Literal["fully_functional", "partially_functional", "not_functional"]
DamageType = Literal[
    "none", "screen_crack", "screen_scratch", "dead_pixel",
    "body_damage", "keyboard_damage", "battery_issue", "port_damage",
]
Recommendation = Literal["sell", "repair", "recycle", "upgrade"]


class DeviceMetadata(BaseModel):
    device_type: DeviceType
    brand_tier: BrandTier = "mid"
    original_price_inr: float = Field(..., gt=0)
    age_months: int = Field(..., ge=0)
    battery_health_pct: int = Field(80, ge=0, le=100)
    functional_status: FunctionalStatus = "fully_functional"

    # Optional manual override if the user skips image upload / CV detection fails
    damage_type: Optional[DamageType] = None
    damage_severity: Optional[float] = Field(None, ge=0, le=1)


class DamageDetection(BaseModel):
    damage_type: DamageType
    damage_severity: float
    confidence: float
    source: Literal["yolo_model", "yolo_local", "manual_override", "mock_fallback"]


class AnalyzeResponse(BaseModel):
    detection: DamageDetection
    recommendation: Recommendation
    recommendation_confidence: float
    estimated_repair_cost_inr: float
    estimated_resale_value_inr: float
    explanation: str


class UpgradeAdviceRequest(BaseModel):
    device_type: DeviceType
    current_specs: str = Field(..., description="Free-text description of current device specs")
    budget_inr: Optional[float] = None
    use_case: Optional[str] = None


class UpgradeAdviceResponse(BaseModel):
    advice: str


class RepairShop(BaseModel):
    name: str
    address: str
    latitude: float
    longitude: float
    distance_km: Optional[float] = None
    rating: Optional[float] = None


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(..., min_length=1)


class ChatResponse(BaseModel):
    reply: str


class HistoryEntry(BaseModel):
    id: str
    created_at: str
    device_type: DeviceType
    recommendation: Recommendation
    estimated_repair_cost_inr: float
    estimated_resale_value_inr: float
    damage_type: DamageType


# --- Marketplace & Component Compatibility System ------------------------

ListingType = Literal["whole_device", "parts"]
ListingStatus = Literal["active", "reserved", "sold", "paused", "removed", "flagged"]
PartCondition = Literal["excellent", "good", "fair", "damaged", "for_parts"]
VerificationLevel = Literal["seller_reported", "diagnostically_tested", "technician_verified", "refurbished", "unknown"]
TestStatus = Literal["PASS", "FAIL", "NOT_TESTED", "UNKNOWN", "NOT_APPLICABLE"]
CompatibilityOutcome = Literal["VERIFIED_COMPATIBLE", "LIKELY_COMPATIBLE", "INCOMPATIBLE", "UNKNOWN"]

PartCategory = Literal[
    "screen", "battery", "motherboard", "camera", "keyboard",
    "chassis", "charging_port", "speaker", "ram", "storage", "gpu",
    "cpu", "trackpad", "fans", "power_adapter", "other",
]


class DiagnosticTestResult(BaseModel):
    test_name: str
    status: TestStatus
    details: Optional[str] = None
    tested_at: Optional[str] = None


class ComponentSpecification(BaseModel):
    part_number: Optional[str] = None
    manufacturer: Optional[str] = None
    interface_type: Optional[str] = None  # e.g., PCIe NVMe, M.2 SATA, eDP 30-pin, Apple 40-pin flex
    form_factor: Optional[str] = None     # e.g., M.2 2280, 2.5-inch, SODIMM 260-pin
    pin_count: Optional[int] = None
    power_rating: Optional[str] = None    # e.g., 65W, 3.85V 4000mAh
    revision: Optional[str] = None
    capacity: Optional[str] = None        # e.g., 16GB, 512GB
    specs_json: Optional[dict[str, str]] = Field(default_factory=dict)


class PartListing(BaseModel):
    part_id: str
    category: PartCategory
    condition: PartCondition
    price_inr: float = Field(..., ge=0)
    images: list[str] = Field(default_factory=list)
    description: Optional[str] = None
    compatible_models: Optional[str] = None
    verification_level: VerificationLevel = "seller_reported"
    specifications: Optional[ComponentSpecification] = None
    test_results: list[DiagnosticTestResult] = Field(default_factory=list)
    known_defects: Optional[str] = None
    exact_model_number: Optional[str] = None
    variant_region: Optional[str] = None


class RegisteredDevice(BaseModel):
    id: str
    owner_uid: str
    brand: str
    model_family: str
    model_name: str
    exact_model_number: str
    variant_region: Optional[str] = None
    device_type: DeviceType
    condition: PartCondition
    purchase_year: Optional[int] = None
    ownership_declared: bool = True
    created_at: str
    diagnostic_reports: list[dict] = Field(default_factory=list)


class DeviceRegistrationRequest(BaseModel):
    device_type: DeviceType
    brand: str
    model_name: str
    exact_model_number: str
    variant_region: Optional[str] = None
    condition: PartCondition = "good"
    purchase_year: Optional[int] = None
    ownership_declared: bool = True
    diagnostic_summary: Optional[str] = None


class ListingCreateRequest(BaseModel):
    device_type: DeviceType
    brand: str
    model_name: str
    listing_type: ListingType
    title: str
    description: Optional[str] = None
    exact_model_number: Optional[str] = None
    variant_region: Optional[str] = None

    # populated when listing_type == "whole_device"
    images: list[str] = Field(default_factory=list)
    price_inr: Optional[float] = Field(None, ge=0)
    condition: Optional[PartCondition] = None

    # populated when listing_type == "parts"
    parts: list[PartListing] = Field(default_factory=list)

    # optional link back to an /api/analyze-device result that led here
    recommendation_source: Optional[Recommendation] = None


class MarketplaceListing(BaseModel):
    id: str
    seller_uid: str
    seller_email: Optional[str] = None
    created_at: str
    status: ListingStatus = "active"

    device_type: DeviceType
    brand: str
    model_name: str
    exact_model_number: Optional[str] = None
    variant_region: Optional[str] = None
    listing_type: ListingType
    title: str
    description: Optional[str] = None

    images: list[str] = Field(default_factory=list)
    price_inr: Optional[float] = None
    condition: Optional[PartCondition] = None

    parts: list[PartListing] = Field(default_factory=list)
    recommendation_source: Optional[Recommendation] = None
    fraud_assessment_id: Optional[str] = None
    risk_level: Optional[str] = None


class ListingStatusUpdateRequest(BaseModel):
    status: ListingStatus


class CompatibilityEvaluationRequest(BaseModel):
    target_device_type: DeviceType
    target_brand: str
    target_model_name: str
    target_exact_model: Optional[str] = None
    target_variant: Optional[str] = None
    needed_part_category: PartCategory
    candidate_listing_id: Optional[str] = None
    candidate_part_id: Optional[str] = None
    part_number: Optional[str] = None


class CompatibilityEvidenceSource(BaseModel):
    title: str
    source_type: Literal["manufacturer_spec", "verified_database", "technical_manual", "community_verified"]
    url_or_ref: str
    verification_date: str
    notes: Optional[str] = None


class CompatibilityEvaluationResponse(BaseModel):
    outcome: CompatibilityOutcome
    compatibility_score: float = Field(..., ge=0, le=100)
    supporting_evidence: list[str] = Field(default_factory=list)
    matched_specs: list[str] = Field(default_factory=list)
    unverified_specs: list[str] = Field(default_factory=list)
    detected_conflicts: list[str] = Field(default_factory=list)
    evidence_sources: list[CompatibilityEvidenceSource] = Field(default_factory=list)
    explanation: str
    expert_verification_recommended: bool = False


class ComponentSearchRequest(BaseModel):
    device_type: DeviceType
    brand: str
    model_name: str
    exact_model_number: Optional[str] = None
    variant_region: Optional[str] = None
    needed_part_category: PartCategory
    max_price_inr: Optional[float] = None
    min_verification_level: Optional[VerificationLevel] = None


class MatchCandidate(BaseModel):
    listing_id: str
    part_id: Optional[str] = None
    type: Literal["part", "donor_device"]
    title: str
    brand: str
    model_name: str
    exact_model_number: Optional[str] = None
    price_inr: float
    total_estimated_cost_inr: float
    condition: PartCondition
    verification_level: VerificationLevel
    compatibility_outcome: CompatibilityOutcome
    compatibility_score: float
    explanation: str
    matched_specs: list[str] = Field(default_factory=list)
    unverified_specs: list[str] = Field(default_factory=list)
    evidence_sources: list[CompatibilityEvidenceSource] = Field(default_factory=list)
    seller_uid: str
    seller_email: Optional[str] = None
    image_url: Optional[str] = None


class ReservationCreateRequest(BaseModel):
    listing_id: str
    part_id: Optional[str] = None
    buyer_notes: Optional[str] = None
    idempotency_key: str


class Reservation(BaseModel):
    id: str
    listing_id: str
    part_id: Optional[str] = None
    buyer_uid: str
    seller_uid: str
    status: Literal["RESERVED", "SOLD", "CANCELLED", "EXPIRED"]
    created_at: str
    expires_at: str
    idempotency_key: str
    buyer_notes: Optional[str] = None


class ListingReportRequest(BaseModel):
    listing_id: str
    reason: Literal["misleading_specs", "incompatible_claim", "counterfeit_suspected", "damaged_hazard", "other"]
    details: str


# --- Messaging -------------------------------------------------------------

class ConversationMessage(BaseModel):
    id: str
    conversation_id: str
    sender_uid: str
    text: str
    created_at: str

class MessageCreateRequest(BaseModel):
    text: str

class Conversation(BaseModel):
    id: str
    listing_id: str
    buyer_uid: str
    seller_uid: str
    created_at: str
    last_message_at: str
    last_message_text: Optional[str] = None
    
    listing_title: Optional[str] = None
    listing_image: Optional[str] = None
    other_user_email: Optional[str] = None

class ConversationCreateRequest(BaseModel):
    listing_id: str
    seller_uid: str


# --- Fraud & Anomaly Detection (Isolation Forest) -------------------------

RiskLevel = Literal["low", "medium", "high", "critical"]
ReviewStatus = Literal["pending", "reviewed", "false_positive", "confirmed_fraud", "resolved"]
SecurityEventType = Literal[
    "login_success", "login_failure", "rate_limit_triggered", "logout", "password_reset"
]
FraudAssessmentEventType = Literal[
    "login_attempt", "listing_created", "listing_updated", "match_request", "reservation_created"
]

class SecurityEvent(BaseModel):
    id: str
    user_id: Optional[str] = None
    email: Optional[str] = None
    event_type: SecurityEventType
    ip_address: Optional[str] = None
    timestamp: str
    metadata: dict = Field(default_factory=dict)

class LoginAttemptRequest(BaseModel):
    email: str

class LoginResultRequest(BaseModel):
    email: str
    success: bool
    error_code: Optional[str] = None

class LoginAttemptResponse(BaseModel):
    allowed: bool
    remaining_attempts: int
    cooldown_seconds: int = 0
    message: Optional[str] = None

class FraudAssessment(BaseModel):
    event_id: str
    user_id: str
    user_email: Optional[str] = None
    event_type: str
    entity_id: Optional[str] = None
    listing_title: Optional[str] = None
    device_name: Optional[str] = None
    device_type: Optional[str] = None
    brand: Optional[str] = None
    model_name: Optional[str] = None
    anomaly_score: float
    risk_level: RiskLevel
    risk_indicators: list[str] = Field(default_factory=list)
    observed_features: dict = Field(default_factory=dict)
    model_version: str
    created_at: str
    review_status: ReviewStatus = "pending"
    reviewer_id: Optional[str] = None
    review_notes: Optional[str] = None
    reviewed_at: Optional[str] = None

class FraudReviewActionRequest(BaseModel):
    review_status: ReviewStatus
    review_notes: Optional[str] = None

class UserRestrictionRequest(BaseModel):
    is_restricted: bool
    reason: Optional[str] = None

class FraudSummaryMetrics(BaseModel):
    total_assessments: int
    low_risk_count: int
    medium_risk_count: int
    high_risk_count: int
    critical_risk_count: int
    pending_review_count: int
    flagged_listings_count: int
    security_events_24h: int
    model_version: str
    model_health: str


