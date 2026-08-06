from typing import List, Dict, Any
from app.marketplace_service import list_listings

class PartMatchingService:
    def find_matches(self, device_type: str, brand: str, model_name: str, needed_part_category: str) -> List[Dict[str, Any]]:
        """
        Find parts or broken devices that can supply the needed part for the specified device.
        """
        matches = []
        
        # Get all active listings
        all_listings = list_listings(status="active", limit=1000)
        
        for listing in all_listings:
            # Match by device type, brand and model for exact compatibility
            if listing.device_type == device_type and listing.brand.lower() == brand.lower() and listing.model_name.lower() == model_name.lower():
                
                if listing.listing_type == "parts":
                    for part in listing.parts:
                        if part.category == needed_part_category and part.condition in ["excellent", "good", "fair"]:
                            matches.append({
                                "listing_id": listing.id,
                                "type": "part",
                                "title": listing.title,
                                "price": part.price_inr,
                                "condition": part.condition,
                                "seller_id": listing.seller_uid
                            })
                
                elif listing.listing_type == "whole_device":
                    # If it's a whole device, we assume parts are good unless it's explicitly broken in that area
                    # This is simplified: in a real scenario we'd parse the description or damage_type
                    # Here we just suggest the whole device as a donor
                    if listing.condition in ["damaged", "for_parts", "fair", "good", "excellent"]:
                        matches.append({
                            "listing_id": listing.id,
                            "type": "donor_device",
                            "title": listing.title,
                            "price": listing.price_inr,
                            "condition": listing.condition,
                            "seller_id": listing.seller_uid
                        })
                        
        return matches

part_matching_service = PartMatchingService()
