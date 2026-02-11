# TECHNOLOGY STACK & CODING STANDARDS

## LANGUAGE ENVIRONMENT
- **Python:** Version 3.12 (Strict). Avoid 3.13 specific features due to library compatibility.
- **Type Hinting:** Mandatory for all function signatures.

## BACKEND FRAMEWORK
- **FastAPI:** Use `async/await` for all IO-bound operations (DB, API calls).
- **Pydantic:** v2.0+. Use `model_config` for settings.

## DATABASE (ORM)
- **Database:** PostgreSQL 14+.
- **Library:** SQLAlchemy 2.0+.
- **Style:** Use `DeclarativeBase` and `Mapped[type]` syntax (Modern style).
- **Special Features:** Use `Computed()` columns for Gross Exposure calculations at DB level.
- **Migrations:** Alembic.

## DATA INGESTION (RESILIENCE)
- **Pattern:** Provider Adapter Pattern with Fallback.
- **Primary:** `yfinance` (Yahoo Finance).
- **Fallback:** `alpha_vantage` (Only for specific failed contracts).
- **Validation:** Check for `Volume=0` or `Null` data before processing.

## ASYNC TASKS
- **Engine:** Celery with Redis broker.
- **Scheduler:** Celery Beat for Friday 20:00 UTC cron jobs.

## TESTING
- **Framework:** `pytest` with `pytest-asyncio`.
- **Philosophy:** Unit test math formulas (Z-Score, VWAP) extensively.