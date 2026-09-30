"""
Upgrade advisor powered by Google Gemini's free tier.
Get a free key at https://aistudio.google.com/apikey
"""

import logging
import requests

from app.config import settings

logger = logging.getLogger(__name__)

GEMINI_URL_TEMPLATE = (
    "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
)

# Resilient list of models to try in case of 503 high demand or 429 rate limits
FALLBACK_MODELS = [
    "gemini-flash-lite-latest",
    "gemini-3.1-flash-lite",
    "gemini-3.5-flash-lite",
    "gemini-3.8-flash",
    "gemini-flash-latest",
]


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

    models_to_try = [settings.gemini_model] if settings.gemini_model else []
    for model in FALLBACK_MODELS:
        if model not in models_to_try:
            models_to_try.append(model)

    last_error = None
    headers = {
        "x-goog-api-key": settings.gemini_api_key,
        "Content-Type": "application/json",
    }

    for model in models_to_try:
        url = GEMINI_URL_TEMPLATE.format(model=model)
        try:
            resp = requests.post(
                url,
                headers=headers,
                json={"contents": [{"parts": [{"text": prompt}]}]},
                timeout=15,
            )
            if resp.status_code == 200:
                data = resp.json()
                return data["candidates"][0]["content"]["parts"][0]["text"]

            logger.warning("Gemini model %s returned status %s: %s", model, resp.status_code, resp.text[:200])
            last_error = f"Model {model} returned status {resp.status_code}"
        except (requests.RequestException, KeyError, IndexError) as e:
            logger.warning("Gemini model %s failed: %s", model, e)
            last_error = str(e)

    return (
        "Upgrade advisor is temporarily unavailable due to high demand on Gemini servers. "
        "Please try again in a few moments."
    )

