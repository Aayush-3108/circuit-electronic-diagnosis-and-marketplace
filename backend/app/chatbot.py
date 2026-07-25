"""
Chatbot powered by Groq's free-tier API (OpenAI-compatible /chat/completions).
Get a free key at https://console.groq.com/keys

Groq's free tier includes fast open models like llama-3.3-70b-versatile,
llama-3.1-8b-instant, and gemma2-9b-it -- plenty for a capstone chatbot with
no cost. Rate limits are generous enough for demo/dev traffic; see
https://console.groq.com/docs/rate-limits if you hit them.
"""

import requests

from app.config import settings

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

SYSTEM_PROMPT = """You are the Circuit assistant -- a helpful, concise chatbot embedded in \
Circuit, an electronics marketplace app where users upload photos of damaged devices \
(phones, laptops, tablets, PCs, monitors) and get an AI-driven recommendation to sell, \
repair, or recycle them, plus nearby repair shop suggestions and upgrade advice.

Your job:
- Answer questions about how the app works (the analyze flow, what the recommendation \
  types mean, how cost/resale estimates are computed).
- Give general, safe troubleshooting tips for common device issues (won't turn on, \
  battery drains fast, cracked screen, water damage, etc.) -- practical first steps only, \
  never anything that requires opening a device unsafely (e.g. never suggest handling a \
  swollen/damaged lithium battery, that's a fire/chemical hazard -- tell them to stop using \
  it and take it to a professional).
- Help users decide between the app's sell / repair / recycle / upgrade recommendation \
  categories if they're unsure what a result means.
- If asked something unrelated to devices/electronics/the app, politely redirect.

Keep replies short -- 2-4 sentences unless the user asks for more detail. Plain, friendly \
tone, no unnecessary disclaimers."""


def _fallback_reply() -> str:
    return (
        "Chatbot is running in demo mode (no GROQ_API_KEY configured). "
        "Add a free key from https://console.groq.com/keys to backend/.env "
        "to enable live responses."
    )


def get_chat_reply(messages: list[dict]) -> str:
    """
    messages: list of {"role": "user"|"assistant", "content": str}, most recent last.
    The system prompt is injected automatically.
    """
    if not settings.groq_api_key:
        return _fallback_reply()

    payload_messages = [{"role": "system", "content": SYSTEM_PROMPT}] + messages

    try:
        resp = requests.post(
            GROQ_URL,
            headers={
                "Authorization": f"Bearer {settings.groq_api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": settings.groq_model,
                "messages": payload_messages,
                "temperature": 0.6,
                "max_tokens": 400,
            },
            timeout=20,
        )
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"]
    except (requests.RequestException, KeyError, IndexError) as e:
        return f"Chatbot is temporarily unavailable ({e})."
