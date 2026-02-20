import sys
import os
import pandas as pd
from sqlalchemy import text
from loguru import logger

# Fix path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../')))

from app.db.session import SessionLocal

def validate():
    db = SessionLocal()
    try:
        # Query the VIEW for Bitcoin
        print("\n=== VALIDATING LOGIC (BITCOIN SAMPLE) ===")
        query = text("""
            SELECT 
                report_date,
                lev_long,
                lev_short,
                lev_net,
                lev_ls_ratio,
                lev_long_chg as lev_long_change,
                lev_net_change
            FROM v_weekly_report_changes
            WHERE contract_name = 'BITCOIN'
            ORDER BY report_date DESC
            LIMIT 3;
        """)
        
        df = pd.read_sql(query, db.bind)
        
        if df.empty:
            print("No data found to validate.")
            return

        print(df.to_string(index=False))

        # Mathematical Test
        latest = df.iloc[0]
        prev = df.iloc[1]

        print("\n--- Technical Audit ---")
        # 1. Verify Net (Long - Short)
        expected_net = latest['lev_long'] - latest['lev_short']
        print(f"Computed Net check: {latest['lev_long']} - {latest['lev_short']} = {latest['lev_net']} (Expected: {expected_net})")
        
        # 2. Verify Weekly Delta (Current Long - Previous Long)
        expected_change = latest['lev_long'] - prev['lev_long']
        print(f"Weekly Delta check: {latest['lev_long']} - {prev['lev_long']} = {latest['lev_long_change']} (Expected: {expected_change})")

        if latest['lev_net'] == expected_net and latest['lev_long_change'] == expected_change:
            print("\n✅ VALIDATION SUCCESSFUL: Database logic is consistent.")
        else:
            print("\n❌ VALIDATION FAILED: Calculations do not match.")

    except Exception as e:
        logger.error(f"Validation failed: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    validate()
