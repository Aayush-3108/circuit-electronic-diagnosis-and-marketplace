"""
Security Service for ReCircuit.

Enforces:
1. Brute-force protection & sliding-window rate limiting for authentication.
2. Temporary cooldown enforcement without user enumeration.
3. Security event persistence and audit logging.
"""

import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional

from app.config import settings
from app import sqlite_store


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class SecurityService:
    def check_login_rate_limit(self, email: str, ip_address: Optional[str] = None) -> dict:
        """
        Evaluates whether an IP or email address has triggered brute-force cooldown.
        Returns:
            {
                "allowed": bool,
                "remaining_attempts": int,
                "cooldown_seconds": int,
                "message": Optional[str]
            }
        """
        clean_email = email.lower().strip()
        window_sec = settings.auth_rate_limit_window_minutes * 60
        cooldown_sec = settings.auth_rate_limit_cooldown_minutes * 60

        # Count failures in the cooldown window
        recent_failures = sqlite_store.count_recent_security_events(
            event_type="login_failure",
            email=clean_email,
            ip_address=ip_address,
            window_seconds=cooldown_sec,
        )

        max_attempts = settings.auth_rate_limit_max_attempts
        if recent_failures >= max_attempts:
            # Find the most recent failure to calculate remaining cooldown
            failures = sqlite_store.list_security_events(email=clean_email, event_type="login_failure", limit=1)
            remaining_cooldown = cooldown_sec
            if failures:
                try:
                    last_time = datetime.fromisoformat(failures[0]["timestamp"])
                    now = datetime.now(timezone.utc)
                    elapsed = (now - last_time).total_seconds()
                    remaining_cooldown = max(int(cooldown_sec - elapsed), 1)
                except Exception:
                    remaining_cooldown = cooldown_sec

            if remaining_cooldown > 0:
                minutes = max(1, remaining_cooldown // 60)
                return {
                    "allowed": False,
                    "remaining_attempts": 0,
                    "cooldown_seconds": remaining_cooldown,
                    "message": f"Too many failed login attempts. Account temporarily protected. Please try again in {minutes} minute{'s' if minutes != 1 else ''}.",
                }

        remaining = max(0, max_attempts - recent_failures)
        return {
            "allowed": True,
            "remaining_attempts": remaining,
            "cooldown_seconds": 0,
            "message": None,
        }

    def record_login_attempt(self, email: str, ip_address: Optional[str] = None) -> dict:
        """Called before authentication to verify rate limit status."""
        return self.check_login_rate_limit(email=email, ip_address=ip_address)

    def record_login_result(
        self,
        email: str,
        success: bool,
        user_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        error_code: Optional[str] = None,
    ) -> None:
        """Records authentication outcome (success or failure) and evaluates anomalies."""
        clean_email = email.lower().strip()
        event_id = f"sec_{uuid.uuid4().hex[:12]}"
        event_type = "login_success" if success else "login_failure"

        event = {
            "id": event_id,
            "user_id": user_id or f"usr_{clean_email}",
            "email": clean_email,
            "event_type": event_type,
            "ip_address": ip_address,
            "timestamp": _now_iso(),
            "metadata": {
                "success": success,
                "error_code": error_code,
            },
        }
        sqlite_store.save_security_event(event)

        # If failed login, check if brute-force threshold is breached to flag an anomaly assessment
        if not success:
            recent_fails = sqlite_store.count_recent_security_events(
                event_type="login_failure",
                email=clean_email,
                window_seconds=settings.auth_rate_limit_window_minutes * 60,
            )
            if recent_fails >= settings.auth_rate_limit_max_attempts:
                # Import lazily to avoid circular imports
                from app.fraud_service import fraud_service
                fraud_service.evaluate_auth_anomaly(
                    user_id=user_id or f"usr_{clean_email}",
                    email=clean_email,
                    failed_attempts=recent_fails,
                    ip_address=ip_address,
                )


security_service = SecurityService()
