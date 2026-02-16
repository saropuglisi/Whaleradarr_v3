#!/usr/bin/env python3
"""
Script to load daily price data for technical analysis.
Run this to populate the daily_prices table.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.db.session import SessionLocal
from app.services.data.price_loader import PriceLoaderService
from loguru import logger

def main():
    logger.info("Starting daily price data load...")
    
    db = SessionLocal()
    try:
        loader = PriceLoaderService(db)
        loader.fetch_and_load_daily_prices(days_back=365)
        logger.success("Daily price data load completed successfully!")
    except Exception as e:
        logger.error(f"Error loading daily prices: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    main()
