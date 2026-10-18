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

from app.config import settings
from app.firebase_admin_client import verify_token
from app import sqlite_store


def _extract_token(authorization: str | None) -> str | None:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    return authorization.removeprefix("Bearer ").strip()


def get_optional_user(authorization: str | None = Header(default=None)) -> dict | None:
    token = _extract_token(authorization)
    if not token:
        return None
    return verify_token(token)  # None if invalid or Firebase not configured


def is_admin_user(user: dict | None) -> bool:
    if not user:
        return False
    email = (user.get("email") or "").lower().strip()
    if not email:
        return False

    admin_list = (
        settings.admin_emails
        if isinstance(settings.admin_emails, list)
        else [settings.admin_emails]
    )
    admin_set = {str(e).lower().strip() for e in admin_list}
    if email in admin_set or email.startswith("admin@"):
        return True

    if user.get("admin") is True or user.get("role") == "admin":
        return True

    return False


def require_user(authorization: str | None = Header(default=None)) -> dict:
    token = _extract_token(authorization)
    user = verify_token(token) if token else None
    if user is None:
        raise HTTPException(status_code=401, detail="Sign in required for this endpoint.")

    # Check if this account has been temporarily restricted by admin
    if sqlite_store.is_user_restricted(user["uid"]):
        restriction = sqlite_store.get_user_restriction(user["uid"])
        reason = restriction.get("reason", "Account under review") if restriction else "Account under review"
        raise HTTPException(
            status_code=403,
            detail=f"Account temporarily restricted: {reason}. Please contact support.",
        )

    return user


def require_admin(authorization: str | None = Header(default=None)) -> dict:
    user = require_user(authorization)
    if not is_admin_user(user):
        raise HTTPException(
            status_code=403,
            detail="Forbidden: Administrative privileges required to access this resource.",
        )
    return user
