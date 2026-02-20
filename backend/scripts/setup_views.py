import sys
import os
from sqlalchemy import text
from loguru import logger

# Fix path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../')))

from app.db.session import SessionLocal

def create_views():
    db = SessionLocal()
    try:
        logger.info("Creating Optimized SQL Views with Ratios, Changes and OHLC Prices...")
        
        db.execute(text("DROP VIEW IF EXISTS v_weekly_report_changes CASCADE;"))
        db.commit()

        # Vista ottimizzata completa con Prezzi
        view_sql = """
        CREATE VIEW v_weekly_report_changes AS
        SELECT 
            c.yahoo_ticker as ticker,
            c.contract_name,
            r.contract_id,
            r.report_date,
            
            -- PREZZI (Tuesday OHLC)
            p.open_price,
            p.high_price,
            p.low_price,
            p.close_price,
            p.volume as market_volume,

            -- 1. DEALER
            r.dealer_net,
            (r.dealer_long_chg - r.dealer_short_chg) as dealer_net_change,
            r.dealer_long,
            r.dealer_long_chg,
            r.dealer_short,
            r.dealer_short_chg,
            r.dealer_ls_ratio,

            -- 2. ASSET MANAGER
            r.asset_mgr_net,
            (r.asset_mgr_long_chg - r.asset_mgr_short_chg) as asset_mgr_net_change,
            r.asset_mgr_long,
            r.asset_mgr_long_chg,
            r.asset_mgr_short,
            r.asset_mgr_short_chg,
            r.asset_mgr_ls_ratio,

            -- 3. LEVERAGED FUNDS (Whales)
            r.lev_net,
            (r.lev_long_chg - r.lev_short_chg) as lev_net_change,
            r.lev_long,
            r.lev_long_chg,
            r.lev_short,
            r.lev_short_chg,
            r.lev_ls_ratio,

            -- Market
            r.open_interest,
            r.open_interest_chg as oi_change

        FROM weekly_reports r
        JOIN contracts c ON r.contract_id = c.id
        LEFT JOIN weekly_prices p ON (r.contract_id = p.contract_id AND r.report_date = p.report_date);
        """
        
        db.execute(text(view_sql))
        db.commit()
        logger.success("Optimized View 'v_weekly_report_changes' created with Integrated Price Data.")

    except Exception as e:
        logger.error(f"Failed to update view: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_views()
