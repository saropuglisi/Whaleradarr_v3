from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import insert
from app.models.report import WeeklyReport
from app.models.contract import Contract
from datetime import datetime
from loguru import logger
import pandas as pd

class COTLoaderService:
    def __init__(self, db: Session):
        self.db = db
        # Pre-carica mappa ID
        self.contract_map = {
            c.cftc_contract_code: c.id 
            for c in db.query(Contract).all()
        }

    def upsert_reports(self, df: pd.DataFrame):
        if df.empty:
            return

        records = []
        for _, row in df.iterrows():
            c_code = str(row['cftc_contract_code'])
            if c_code not in self.contract_map:
                continue 

            # Mappa colonne DataFrame -> Modello DB
            # ESCLUDERE colonne generate (lev_gross_exposure)
            db_record = {
                "contract_id": self.contract_map[c_code],
                "report_date": row['report_date'],
                "open_interest": row.get('open_interest', 0),
                "dealer_long": row.get('dealer_long', 0),
                "dealer_short": row.get('dealer_short', 0),
                "dealer_spread": row.get('dealer_spread', 0),
                "asset_mgr_long": row.get('asset_mgr_long', 0),
                "asset_mgr_short": row.get('asset_mgr_short', 0),
                "asset_mgr_spread": row.get('asset_mgr_spread', 0),
                "lev_long": row.get('lev_money_long', 0),
                "lev_short": row.get('lev_money_short', 0),
                "lev_spread": row.get('lev_money_spread', 0),
                "non_report_long": row.get('non_report_long', 0),
                "non_report_short": row.get('non_report_short', 0)
            }
            records.append(db_record)

        if not records:
            return

        # PostgreSQL Upsert
        stmt = insert(WeeklyReport).values(records)
        
        # Aggiorna tutto tranne chiavi primarie e colonne generate
        update_cols = {
            col.name: col 
            for col in stmt.excluded 
            if col.name not in ['id', 'contract_id', 'report_date', 'lev_gross_exposure']
        }
        
        upsert_stmt = stmt.on_conflict_do_update(
            constraint='uq_contract_report_date', # Constraint name definito nel model
            set_=update_cols
        )

        try:
            self.db.execute(upsert_stmt)
            self.db.commit()
            logger.success(f"Upserted {len(records)} reports")
        except Exception as e:
            self.db.rollback()
            logger.error(f"DB Error: {e}")
            raise
