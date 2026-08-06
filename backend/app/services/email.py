import httpx

from app.core.config import settings

RESEND_API_URL = "https://api.resend.com/emails"


def _send_email(to_email: str, subject: str, html: str) -> None:
    if not settings.resend_api_key:
        return

    payload = {
        "from": f"{settings.email_sender_name} <{settings.email_from}>",
        "to": [to_email],
        "subject": subject,
        "html": html,
    }
    headers = {
        "Authorization": f"Bearer {settings.resend_api_key}",
        "Content-Type": "application/json",
    }
    with httpx.Client(timeout=10.0) as client:
        response = client.post(RESEND_API_URL, json=payload, headers=headers)
        response.raise_for_status()


def send_welcome_email(to_email: str) -> None:
    subject = "Welcome to Emilia"
    html = f"""
    <h2>Welcome to Emilia</h2>
    <p>Your account is ready, {to_email}.</p>
    <p>Start chatting and exploring your workspace.</p>
    """
    _send_email(to_email, subject, html)


def send_welcome_back_email(to_email: str) -> None:
    subject = "Welcome back to Emilia"
    html = f"""
    <h2>Welcome back</h2>
    <p>You have successfully logged in as {to_email}.</p>
    <p>Good to see you again.</p>
    """
    _send_email(to_email, subject, html)
