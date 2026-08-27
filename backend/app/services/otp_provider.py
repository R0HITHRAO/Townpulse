"""
TownPulse Pluggable OTP Provider
==================================
Provides abstract interface and concrete implementations for OTP SMS delivery.
Includes MockOTPProvider for local dev/testing, TwilioOTPProvider, and MSG91OTPProvider for production.
"""

from abc import ABC, abstractmethod
import httpx

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


class MSG91OTPProvider(BaseOTPProvider):
    """
    Production OTP provider using MSG91 API.
    Configured via MSG91_* environment variables.
    """

    def __init__(self) -> None:
        self.auth_key = settings.MSG91_AUTH_KEY
        self.template_id = settings.MSG91_TEMPLATE_ID

    async def send_otp(self, phone: str, otp: str) -> bool:
        if not self.auth_key:
            logger.error("MSG91 Auth Key is not configured")
            return False

        # Remove leading + if present
        clean_phone = phone.lstrip("+")
        url = f"https://api.msg91.com/api/v5/otp?template_id={self.template_id}&mobile={clean_phone}&otp={otp}&authkey={self.auth_key}"

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(url)
                if res.status_code == 200:
                    logger.info("MSG91 OTP dispatched", phone=clean_phone[-4:])
                    return True
                logger.error("MSG91 error", status_code=res.status_code, body=res.text)
                return False
        except Exception as e:
            logger.error("MSG91 SMS send exception", error=str(e))
            return False


def get_otp_provider() -> BaseOTPProvider:
    """
    Factory function returning the configured OTP provider.
    Returns MockOTPProvider, TwilioOTPProvider, or MSG91OTPProvider.
    """
    if settings.OTP_PROVIDER == "twilio" and settings.TWILIO_ACCOUNT_SID:
        return TwilioOTPProvider()
    if settings.OTP_PROVIDER == "msg91" and settings.MSG91_AUTH_KEY:
        return MSG91OTPProvider()
    return MockOTPProvider()
