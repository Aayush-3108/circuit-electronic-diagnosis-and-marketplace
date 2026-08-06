from typing import List, Dict, Any
from app.marketplace_service import list_listings

# Hardcoded compatibility rules for prototype
# Maps (brand, model) to a list of compatible models for parts
COMPATIBILITY_RULES = {
    "apple": {
        "iphone 12": ["iphone 12", "iphone 12 pro"],
        "iphone 12 pro": ["iphone 12 pro", "iphone 12"],
        "iphone 13": ["iphone 13", "iphone 13 pro"],
        "macbook pro m1": ["macbook pro m1", "macbook air m1"],
    },
    "samsung": {
        "galaxy s21": ["galaxy s21", "galaxy s21 fe"],
        "galaxy s21 fe": ["galaxy s21 fe", "galaxy s21"],
    }
}

class PartMatchingService:
    def _get_compatible_models(self, brand: str, model_name: str) -> List[str]:
        brand_lower = brand.lower()
        model_lower = model_name.lower()
        
        if brand_lower in COMPATIBILITY_RULES:
            if model_lower in COMPATIBILITY_RULES[brand_lower]:
                return COMPATIBILITY_RULES[brand_lower][model_lower]
        
        # If no explicit rule, only match identical model
        return [model_lower]

    def find_matches(self, device_type: str, brand: str, model_name: str, needed_part_category: str) -> List[Dict[str, Any]]:
        """
        Find parts or broken devices that can supply the needed part for the specified device.
        """
        matches = []
        compatible_models = self._get_compatible_models(brand, model_name)
        
        # Get all active listings
        all_listings = list_listings(status="active", limit=1000)
        
        for listing in all_listings:
            # Match by device type, brand and compatible model
            if listing.device_type == device_type and listing.brand.lower() == brand.lower() and listing.model_name.lower() in compatible_models:
                
                if listing.listing_type == "parts":
                    for part in listing.parts:
                        if part.category == needed_part_category and part.condition in ["excellent", "good", "fair"]:
                            image_url = part.images[0] if part.images else None
                            matches.append({
                                "listing_id": listing.id,
                                "type": "part",
                                "title": listing.title,
                                "price": part.price_inr,
                                "condition": part.condition,
                                "seller_id": listing.seller_uid,
                                "image_url": image_url,
                                "compatible_with": listing.model_name
                            })
                
                elif listing.listing_type == "whole_device":
                    if listing.condition in ["damaged", "for_parts", "fair", "good", "excellent"]:
                        image_url = listing.images[0] if listing.images else None
                        matches.append({
                            "listing_id": listing.id,
                            "type": "donor_device",
                            "title": listing.title,
                            "price": listing.price_inr,
                            "condition": listing.condition,
                            "seller_id": listing.seller_uid,
                            "image_url": image_url,
                            "compatible_with": listing.model_name
                        })
                        
        return matches

part_matching_service = PartMatchingService()
