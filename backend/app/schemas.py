from typing import Literal, Optional

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


# --- Marketplace ---------------------------------------------------------

ListingType = Literal["whole_device", "parts"]
ListingStatus = Literal["active", "sold", "removed"]
PartCondition = Literal["excellent", "good", "fair", "damaged", "for_parts"]
PartCategory = Literal[
    "screen", "battery", "motherboard", "camera", "keyboard",
    "chassis", "charging_port", "speaker", "ram", "storage", "gpu", "other",
]


class PartListing(BaseModel):
    part_id: str
    category: PartCategory
    condition: PartCondition
    price_inr: float = Field(..., ge=0)
    images: list[str] = Field(default_factory=list)
    description: Optional[str] = None
    # free text describing which device models this part fits, e.g.
    # "iPhone 12 / 12 Pro" or "Dell Inspiron 15 3000 series"
    compatible_models: Optional[str] = None


class ListingCreateRequest(BaseModel):
    device_type: DeviceType
    brand: str
    model_name: str
    listing_type: ListingType
    title: str
    description: Optional[str] = None

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
    listing_type: ListingType
    title: str
    description: Optional[str] = None

    images: list[str] = Field(default_factory=list)
    price_inr: Optional[float] = None
    condition: Optional[PartCondition] = None

    parts: list[PartListing] = Field(default_factory=list)
    recommendation_source: Optional[Recommendation] = None


class ListingStatusUpdateRequest(BaseModel):
    status: ListingStatus
