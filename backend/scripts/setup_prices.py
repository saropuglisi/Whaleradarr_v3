import sys
import os
from loguru import logger

# Fix path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../')))

# Import models FIRST to register them with SQLAlchemy
from app.models.contract import Contract
from app.models.report import WeeklyReport
from app.models.price import WeeklyPrice
from app.models.alert import WhaleAlert

from app.db.session import SessionLocal
from app.services.data.price_loader import PriceLoaderService

def main():
    db = SessionLocal()
    try:
        logger.info("Starting Price Ingestion (Tuesdays only)...")
        service = PriceLoaderService(db)
        service.fetch_and_load_prices()
        logger.success("Price ingestion completed.")
    except Exception as e:
        logger.error(f"Price ingestion failed: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    main()
