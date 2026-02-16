import sys
import os
from loguru import logger
from sqlalchemy.orm import Session

# Fix path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../')))

from app.db.session import SessionLocal
from app.models.contract import Contract
from app.services.analyzer import AnalyzerService

def run_pipeline():
    db = SessionLocal()
    try:
        logger.info("=== STARTING ANALYSIS PIPELINE ===")
        
        # 1. Fetch Active Contracts
        contracts = db.query(Contract).filter(Contract.is_active == True).all()
        logger.info(f"Found {len(contracts)} active contracts.")
        
        analyzer = AnalyzerService(db)
        
        for contract in contracts:
            logger.info(f"Processing {contract.contract_name}...")
            
            # 2. Update Statistics (Rolling Median/IQR)
            analyzer.update_contract_statistics(contract.id)
            
            # 3. Generate Alerts (Latest Report)
            analyzer.generate_alerts(contract.id)
            
        logger.success("=== PIPELINE COMPLETED SUCCESSFULLY ===")
        
    except Exception as e:
        logger.error(f"Pipeline Failed: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    run_pipeline()
