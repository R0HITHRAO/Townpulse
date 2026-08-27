"""
TownPulse Pluggable Email Provider
====================================
Provides abstract interface and concrete implementations for transactional email.
Includes MockEmailProvider for dev/testing, SendGridProvider, and SMTPEmailProvider.
"""

import smtplib
from abc import ABC, abstractmethod
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class BaseEmailProvider(ABC):
    """Abstract base class for email delivery."""

    @abstractmethod
    async def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: str | None = None,
    ) -> bool:
        """Send an email to a recipient."""
        pass


class MockEmailProvider(BaseEmailProvider):
    """Mock email provider for local development."""

    async def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: str | None = None,
    ) -> bool:
        logger.info(
            "MOCK EMAIL SENT",
            to=to_email,
            subject=subject,
        )
        print(f"\n[DEV MODE EMAIL] To: {to_email} | Subject: {subject}\n")
        return True


class SendGridEmailProvider(BaseEmailProvider):
    """Production email provider using SendGrid API."""

    def __init__(self) -> None:
        try:
            from sendgrid import SendGridAPIClient

            self.client = SendGridAPIClient(settings.SENDGRID_API_KEY)
        except Exception as e:
            logger.error("Failed to initialize SendGrid", error=str(e))
            self.client = None

    async def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: str | None = None,
    ) -> bool:
        if not self.client:
            logger.error("SendGrid is not configured")
            return False

        from sendgrid.helpers.mail import Content, Email, Mail, To

        message = Mail(
            from_email=Email(settings.EMAIL_FROM, settings.EMAIL_FROM_NAME),
            to_emails=To(to_email),
            subject=subject,
            html_content=Content("text/html", html_content),
        )
        try:
            response = self.client.send(message)
            logger.info("SendGrid email dispatched", status=response.status_code)
            return response.status_code in (200, 201, 202)
        except Exception as e:
            logger.error("SendGrid send error", error=str(e))
            return False


class SMTPEmailProvider(BaseEmailProvider):
    """Standard SMTP email provider."""

    async def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: str | None = None,
    ) -> bool:
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"{settings.EMAIL_FROM_NAME} <{settings.EMAIL_FROM}>"
            msg["To"] = to_email

            if text_content:
                msg.attach(MIMEText(text_content, "plain"))
            msg.attach(MIMEText(html_content, "html"))

            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                if settings.SMTP_TLS:
                    server.starttls()
                if settings.SMTP_USER and settings.SMTP_PASSWORD:
                    server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.sendmail(settings.EMAIL_FROM, [to_email], msg.as_string())

            logger.info("SMTP email sent successfully", to=to_email)
            return True
        except Exception as e:
            logger.error("SMTP send failed", error=str(e), to=to_email)
            return False


def get_email_provider() -> BaseEmailProvider:
    """Factory returning configured email provider."""
    if settings.EMAIL_PROVIDER == "sendgrid" and settings.SENDGRID_API_KEY:
        return SendGridEmailProvider()
    if settings.EMAIL_PROVIDER == "smtp" and settings.SMTP_HOST:
        return SMTPEmailProvider()
    return MockEmailProvider()
