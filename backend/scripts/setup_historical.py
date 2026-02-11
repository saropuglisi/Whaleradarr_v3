import sys
import os
import json
from datetime import datetime
from loguru import logger
from sqlalchemy import text

# Fix path import per eseguire lo script da backend/ o root
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../')))

from app.db.session import SessionLocal, engine
from app.db.base import Base
from app.models.contract import Contract
from app.models.report import WeeklyReport
from app.models.price import WeeklyPrice
from app.models.alert import WhaleAlert
from app.services.data.cftc_ingestor import CFTCIngestor
from app.services.data.cot_loader import COTLoaderService

def init_db():
    logger.info("Initializing Database Schema (Full Reset)...")
    # Attenzione: Questo cancella tutti i dati esistenti
    db = SessionLocal()
    try:
        db.execute(text("DROP VIEW IF EXISTS v_weekly_report_changes CASCADE;"))
        db.commit()
    except Exception as e:
        logger.warning(f"Could not drop view: {e}")
    finally:
        db.close()
        
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

def seed_contracts(db):
    """Popola contracts table da JSON"""
    json_path = os.path.join(os.path.dirname(__file__), 'seed_contracts.json')
    try:
        with open(json_path) as f:
            data = json.load(f)
    except FileNotFoundError:
        logger.error(f"Seed file not found at {json_path}")
        return

    logger.info(f"Seeding {len(data)} contracts...")
    for item in data:
        exists = db.query(Contract).filter_by(cftc_contract_code=item['cftc_contract_code']).first()
        if not exists:
            contract = Contract(
                cftc_contract_code=item['cftc_contract_code'],
                contract_name=item['contract_name'],
                market_category=item['market_category'],
                yahoo_ticker=item['yahoo_ticker'],
                exchange=item.get('exchange'),
                expiry_rule=item.get('expiry_rule', 'third_friday'),
                contract_unit_value=item.get('contract_unit_value', 1.0)
            )
            db.add(contract)
    db.commit()

def main():
    db = SessionLocal()
    try:
        init_db()
        seed_contracts(db)
        
        # Path corretto al JSON
        json_path = os.path.join(os.path.dirname(__file__), 'seed_contracts.json')
        ingestor = CFTCIngestor(whitelist_path=json_path)
        loader = COTLoaderService(db)
        
        current_year = datetime.now().year
        
        # 1. Historical Ingestion (es. 2015-2026)
        start_year = 2015
        logger.info(f"Starting ingestion from {start_year} to {current_year}...")
        
        for year in range(start_year, current_year + 1):
            logger.info(f"--- Processing Historical Year {year} ---")
            
            # Fetch Financial Futures (TFF)
            df_fin = ingestor.fetch_data(year=year, mode='historical', report_type='financial')
            if not df_fin.empty:
                loader.upsert_reports(df_fin)
                
            # Fetch Commodities (Disaggregated)
            df_dis = ingestor.fetch_data(year=year, mode='historical', report_type='disaggregated')
            if not df_dis.empty:
                loader.upsert_reports(df_dis)
            
        # 2. Live Ingestion (Ultimo Report TXT)
        logger.info(f"--- Fetching LIVE Data (Latest Available) ---")
        
        # Live Financial
        df_live_fin = ingestor.fetch_data(mode='live', report_type='financial')
        loader.upsert_reports(df_live_fin)
        
        # Live Commodities
        df_live_dis = ingestor.fetch_data(mode='live', report_type='disaggregated')
        loader.upsert_reports(df_live_dis)

    except Exception as e:
        logger.error(f"Fatal Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    main()
