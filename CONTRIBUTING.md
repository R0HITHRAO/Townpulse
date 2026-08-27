# Contributing to TownPulse

Thank you for your interest in contributing to TownPulse! This document provides
guidelines and instructions for contributing.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Branch Strategy](#branch-strategy)
- [Commit Convention](#commit-convention)
- [Pull Request Process](#pull-request-process)
- [Code Style](#code-style)
- [Testing](#testing)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)

## Code of Conduct

This project adheres to the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md).
By participating, you are expected to uphold this code.

## Getting Started

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/Townpulse.git
   cd Townpulse
   ```
3. Set up the development environment:
   ```bash
   cp .env.example .env
   make dev
   make seed
   ```
4. Create a feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Workflow

1. Pick an issue or create one describing what you want to work on
2. Create a feature branch from `develop`
3. Write code with tests
4. Run linters and tests locally
5. Push and open a PR against `develop`

### Running the development environment

```bash
make dev          # Start all services (backend, frontend, postgres, redis)
make seed         # Seed the database with sample data
make test         # Run all tests
make lint         # Run all linters
make format       # Auto-format code
```

## Branch Strategy

| Branch | Purpose |
|--------|---------|
| `main` | Production-ready code. Protected — requires PR review. |
| `develop` | Integration branch. Features merge here first. |
| `feature/*` | Feature development branches. |
| `fix/*` | Bug fix branches. |
| `docs/*` | Documentation-only changes. |

## Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Types

| Type | Description |
|------|-------------|
| `feat` | A new feature |
| `fix` | A bug fix |
| `docs` | Documentation only changes |
| `style` | Code style changes (formatting, missing semi colons, etc.) |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `perf` | Performance improvement |
| `test` | Adding or updating tests |
| `chore` | Maintenance tasks (dependencies, CI, build, etc.) |
| `ci` | CI/CD changes |

### Examples

```
feat(listings): add geospatial radius search with PostGIS
fix(auth): handle expired OTP gracefully
docs(readme): add deployment instructions for Render
test(claims): add test for admin claim rejection flow
chore(deps): update FastAPI to 0.104.1
```

## Pull Request Process

1. Ensure your branch is up to date with `develop`
2. Run all tests and linters: `make test && make lint`
3. Fill out the PR template completely
4. Request review from at least one maintainer
5. Address review feedback
6. Squash commits if requested

### PR Checklist

- [ ] Tests pass (`make test`)
- [ ] Linters pass (`make lint`)
- [ ] Documentation updated if needed
- [ ] No secrets or credentials committed
- [ ] Migrations included if DB schema changed
- [ ] Screenshots included for UI changes

## Code Style

### Backend (Python)

- **Formatter:** Black (line length 88)
- **Import sorting:** isort
- **Linter:** Ruff
- **Type hints:** Required for all function signatures
- **Docstrings:** Required for public functions and classes

### Frontend (TypeScript/React)

- **Formatter:** Prettier
- **Linter:** ESLint with TypeScript rules
- **Components:** Functional components with TypeScript interfaces
- **Styles:** Tailwind CSS utility classes

### Pre-commit Hooks

Install pre-commit hooks to auto-format on commit:

```bash
pip install pre-commit
pre-commit install
```

## Testing

### Backend

```bash
cd backend
pytest                    # Run all tests
pytest -v                 # Verbose output
pytest tests/test_auth.py # Run specific test file
pytest -k "test_login"    # Run tests matching pattern
```

### Frontend

```bash
cd frontend
npm test                  # Run all tests
npm run test:coverage     # With coverage report
```

## Reporting Bugs

Use the [Bug Report template](.github/ISSUE_TEMPLATE/bug_report.md) and include:

- Clear description of the bug
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, browser, Docker version)
- Screenshots if applicable

## Suggesting Features

Use the [Feature Request template](.github/ISSUE_TEMPLATE/feature_request.md) and include:

- Clear description of the feature
- Use case and motivation
- Proposed implementation (if any)
- Alternatives considered

## 🏷️ Labels

| Label | Description |
|-------|-------------|
| `good first issue` | Great for newcomers |
| `help wanted` | Extra attention needed |
| `bug` | Something isn't working |
| `enhancement` | New feature or improvement |
| `documentation` | Documentation improvements |
| `question` | Further information requested |

---

Thank you for helping make TownPulse better for small-town communities! 🏘️
