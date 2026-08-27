"""
TownPulse Pluggable OTP Provider
==================================
Provides abstract interface and concrete implementations for OTP SMS delivery.
Includes MockOTPProvider for local dev/testing and TwilioOTPProvider for production.
"""

from abc import ABC, abstractmethod

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class BaseOTPProvider(ABC):
    """Abstract base class for OTP providers."""

    @abstractmethod
    async def send_otp(self, phone: str, otp: str) -> bool:
        """
        Send an OTP code to a phone number.

        Args:
            phone: Target phone number in E.164 format.
            otp: 6-digit OTP code string.

        Returns:
            True if sent successfully, False otherwise.
        """
        pass


class MockOTPProvider(BaseOTPProvider):
    """
    Mock OTP provider for local development and testing.
    Logs the OTP to stdout/structured logs instead of sending real SMS.
    """

    async def send_otp(self, phone: str, otp: str) -> bool:
        logger.info(
            "MOCK OTP SENT",
            phone=phone,
            otp=otp,
            hint="Use this OTP to complete verification in local development",
        )
        print(f"\n[DEV MODE] OTP for {phone}: {otp}\n")
        return True


class TwilioOTPProvider(BaseOTPProvider):
    """
    Production OTP provider using Twilio SMS API.
    Configured via TWILIO_* environment variables.
    """

    def __init__(self) -> None:
        try:
            from twilio.rest import Client

            self.client = Client(
                settings.TWILIO_ACCOUNT_SID,
                settings.TWILIO_AUTH_TOKEN,
            )
            self.from_phone = settings.TWILIO_PHONE_NUMBER
        except Exception as e:
            logger.error("Failed to initialize Twilio client", error=str(e))
            self.client = None

    async def send_otp(self, phone: str, otp: str) -> bool:
        if not self.client:
            logger.error("Twilio client is not configured")
            return False

        message_body = (
            f"Your TownPulse verification code is: {otp}. Valid for 10 minutes."
        )

        try:
            message = self.client.messages.create(
                body=message_body,
                from_=self.from_phone,
                to=phone,
            )
            logger.info("Twilio SMS dispatched", sid=message.sid, phone=phone[-4:])
            return True
        except Exception as e:
            logger.error("Twilio SMS send error", error=str(e), phone=phone[-4:])
            return False


def get_otp_provider() -> BaseOTPProvider:
    """
    Factory function returning the configured OTP provider.
    Returns MockOTPProvider for development or TwilioOTPProvider for production.
    """
    if settings.OTP_PROVIDER == "twilio" and settings.TWILIO_ACCOUNT_SID:
        return TwilioOTPProvider()
    return MockOTPProvider()
