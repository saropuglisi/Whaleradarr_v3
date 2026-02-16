#!/usr/bin/env python3
"""
Load COT data for newly added contracts without resetting existing data.
"""
import sys
import os
from datetime import datetime
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.db.session import SessionLocal
from app.services.data.cftc_ingestor import CFTCIngestor
from app.services.data.cot_loader import COTLoaderService
from loguru import logger

def load_new_contract_data():
    db = SessionLocal()
    try:
        json_path = os.path.join(os.path.dirname(__file__), 'seed_contracts.json')
        ingestor = CFTCIngestor(whitelist_path=json_path)
        loader = COTLoaderService(db)
        
        current_year = datetime.now().year
        start_year = 2015
        
        logger.info(f"Loading COT data from {start_year} to {current_year}...")
        
        for year in range(start_year, current_year + 1):
            logger.info(f"--- Processing Year {year} ---")
            
            # Financial Futures
            df_fin = ingestor.fetch_data(year=year, mode='historical', report_type='financial')
            if not df_fin.empty:
                loader.upsert_reports(df_fin)
                
            # Commodities
            df_dis = ingestor.fetch_data(year=year, mode='historical', report_type='disaggregated')
            if not df_dis.empty:
                loader.upsert_reports(df_dis)
        
        # Live data
        logger.info("--- Fetching LIVE Data ---")
        df_live_fin = ingestor.fetch_data(mode='live', report_type='financial')
        if not df_live_fin.empty:
            loader.upsert_reports(df_live_fin)
        
        df_live_dis = ingestor.fetch_data(mode='live', report_type='disaggregated')
        if not df_live_dis.empty:
            loader.upsert_reports(df_live_dis)
            
        logger.success("✅ COT data loading complete!")
        
    except Exception as e:
        logger.error(f"Error: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    load_new_contract_data()
