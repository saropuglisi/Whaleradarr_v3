import sys
import os
from sqlalchemy import text
import pandas as pd

# Set Local Defaults BEFORE importing config
os.environ.setdefault("POSTGRES_HOST", "127.0.0.1")
os.environ.setdefault("POSTGRES_PORT", "5433")
os.environ.setdefault("POSTGRES_USER", "user")
os.environ.setdefault("POSTGRES_PASSWORD", "password")
os.environ.setdefault("POSTGRES_DB", "whaleradarr")

# Fix path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../')))

from app.db.session import SessionLocal

def check_alerts():
    db = SessionLocal()
    try:
        print("\n=== LATEST WHALE ALERTS ===")
        query = text("""
            SELECT 
                c.contract_name,
                w.report_date,
                w.alert_level,
                w.z_score,
                w.price_context,
                w.confidence_score,
                w.is_rollover_week
            FROM whale_alerts w
            JOIN contracts c ON w.contract_id = c.id
            ORDER BY w.report_date DESC, w.confidence_score DESC
            LIMIT 20;
        """)
        
        df = pd.read_sql(query, db.bind)
        
        if df.empty:
            print("❌ No alerts found. Did the pipeline run successfully?")
        else:
            print(df.to_string(index=False))
            print("\n✅ Alerts found! System is working.")
            
    except Exception as e:
        print(f"Error checking alerts: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_alerts()
