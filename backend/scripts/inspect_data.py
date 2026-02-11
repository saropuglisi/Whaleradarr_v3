import sys
import os
import pandas as pd
from sqlalchemy import text
from loguru import logger

# Fix path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../')))

from app.db.session import SessionLocal
from app.models.contract import Contract

def inspect_data():
    db = SessionLocal()
    try:
        # 1. Riepilogo Contratti e Conteggi
        print("\n=== DATA COVERAGE SUMMARY ===")
        query_summary = text("""
            SELECT 
                c.contract_name,
                c.cftc_contract_code,
                COUNT(r.id) as total_reports,
                MIN(r.report_date) as first_date,
                MAX(r.report_date) as last_date
            FROM contracts c
            LEFT JOIN weekly_reports r ON c.id = r.contract_id
            GROUP BY c.id
            ORDER BY total_reports DESC;
        """)
        
        df_summary = pd.read_sql(query_summary, db.bind)
        print(df_summary.to_string(index=False))

        # 2. Dettaglio Ultimi Dati (Esempio su Bitcoin o primo disponibile)
        target_contract = "BITCOIN" # O cambia con "S&P 500 CONSOLIDATED"
        print(f"\n\n=== LATEST DATA SAMPLE: {target_contract} ===")
        
        query_detail = text("""
            SELECT 
                report_date,
                open_interest as OI,
                dealer_long, dealer_short,
                lev_long, lev_short,
                asset_mgr_long, asset_mgr_short
            FROM weekly_reports r
            JOIN contracts c ON r.contract_id = c.id
            WHERE c.contract_name = :name
            ORDER BY report_date DESC
            LIMIT 10;
        """)
        
        df_detail = pd.read_sql(query_detail, db.bind, params={"name": target_contract})
        
        if df_detail.empty:
            print("No data found for this contract.")
        else:
            print(df_detail.to_string(index=False))

    except Exception as e:
        logger.error(f"Inspection failed: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    inspect_data()
