"""
FastAPI dependencies for reading the caller's Firebase identity from the
Authorization header. Two flavors:

- get_optional_user: never raises. Returns None for anonymous/unauthenticated
  requests (or when Firebase isn't configured yet). Used on routes that should
  keep working for everyone but personalize/save data when a user IS signed in
  (e.g. /api/analyze-device).
- require_user: raises 401 if there's no valid token. Used on routes that only
  make sense for a signed-in user (e.g. /api/history).
"""

from fastapi import Header, HTTPException

from app.firebase_admin_client import verify_token


def _extract_token(authorization: str | None) -> str | None:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    return authorization.removeprefix("Bearer ").strip()


def get_optional_user(authorization: str | None = Header(default=None)) -> dict | None:
    token = _extract_token(authorization)
    if not token:
        return None
    return verify_token(token)  # None if invalid or Firebase not configured


def require_user(authorization: str | None = Header(default=None)) -> dict:
    token = _extract_token(authorization)
    user = verify_token(token) if token else None
    if user is None:
        raise HTTPException(status_code=401, detail="Sign in required for this endpoint.")
    return user
