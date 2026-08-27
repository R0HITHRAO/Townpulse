# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

---

## Reporting a Vulnerability

The TownPulse team takes security issues seriously. If you discover a vulnerability, please do **NOT** open a public GitHub issue.

Instead, please send an email directly to security:
📧 **security@townpulse.dev** (or contact the repository maintainer).

Please include:
1. Description of the vulnerability and its potential impact.
2. Steps to reproduce the issue (proof of concept).
3. Any relevant logs or code snippets.

You should receive an acknowledgment within **48 hours**. We will coordinate a fix and release an update prior to public disclosure.

---

## Security Best Practices in TownPulse

- **Authentication:** Passwords are encrypted using native bcrypt hashing with salt. JWT access tokens are short-lived (30 minutes), and refresh tokens are securely rotated.
- **Geospatial & Search Protection:** All PostGIS coordinate calculations and full-text queries are executed via parameterized SQLAlchemy queries to eliminate SQL injection risks.
- **Rate Limiting:** Redis-backed sliding-window rate limiters prevent brute-force attacks on login and phone OTP endpoints.
- **Role-Based Access Control (RBAC):** Admin endpoints require strict `UserRole.admin` privilege checks enforced via FastAPI dependency injection barriers.
