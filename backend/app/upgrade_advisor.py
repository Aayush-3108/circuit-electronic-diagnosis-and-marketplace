"""
Upgrade advisor powered by Google Gemini's free tier.
Get a free key at https://aistudio.google.com/apikey
"""

import requests

from app.config import settings

GEMINI_URL_TEMPLATE = (
    "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
)


def get_upgrade_advice(device_type: str, current_specs: str, budget_inr: float | None, use_case: str | None) -> str:
    if not settings.gemini_api_key:
        return (
            "Upgrade advisor is running in demo mode (no GEMINI_API_KEY configured). "
            "Add a free key from https://aistudio.google.com/apikey to backend/.env "
            "to enable live recommendations."
        )

    prompt = (
        f"A user has a {device_type} with these specs: {current_specs}. "
        f"{'Their budget for an upgrade is INR ' + str(budget_inr) + '. ' if budget_inr else ''}"
        f"{'Their primary use case is: ' + use_case + '. ' if use_case else ''}"
        "Suggest 2-3 specific upgrade paths available in the Indian market, "
        "briefly explaining the tradeoffs of each (price vs performance vs longevity). "
        "Keep the response under 200 words, structured as a short list."
    )

    url = GEMINI_URL_TEMPLATE.format(model=settings.gemini_model)
    try:
        resp = requests.post(
            url,
            params={"key": settings.gemini_api_key},
            json={"contents": [{"parts": [{"text": prompt}]}]},
            timeout=20,
        )
        resp.raise_for_status()
        data = resp.json()
        return data["candidates"][0]["content"]["parts"][0]["text"]
    except (requests.RequestException, KeyError, IndexError) as e:
        return f"Upgrade advisor is temporarily unavailable ({e})."
