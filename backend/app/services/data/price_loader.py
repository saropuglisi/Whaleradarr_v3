import yfinance as yf
import pandas as pd
from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import insert
from app.models.price import WeeklyPrice
from app.models.contract import Contract
from loguru import logger
from datetime import datetime, timedelta

class PriceLoaderService:
    def __init__(self, db: Session):
        self.db = db

    def fetch_and_load_prices(self, days_back: int = 365 * 10):
        """Downloads prices and handles holidays with Forward Fill logic"""
        contracts = self.db.query(Contract).filter(Contract.yahoo_ticker != None).all()
        
        for contract in contracts:
            logger.info(f"Fetching prices for {contract.contract_name} ({contract.yahoo_ticker})...")
            
            ticker = yf.Ticker(contract.yahoo_ticker)
            df = ticker.history(period="max", interval="1d")
            
            if df.empty:
                logger.warning(f"No price data found for {contract.yahoo_ticker}")
                continue

            # 1. DataFrame Preparation
            df.index = df.index.tz_localize(None) # Remove timezone for DB compatibility
            
            # Create a full range of dates to not miss holiday Tuesdays
            all_dates = pd.date_range(start=df.index.min(), end=df.index.max(), freq='D')
            df = df.reindex(all_dates)
            
            # 2. FORWARD FILL: If a day is missing (holiday), take the price of the previous day
            df[['Open', 'High', 'Low', 'Close', 'Volume']] = df[['Open', 'High', 'Low', 'Close', 'Volume']].ffill()
            
            df = df.reset_index().rename(columns={'index': 'Date'})
            df['Date'] = df['Date'].dt.date
            
            # 3. Extraction of Tuesdays (Tuesday = 1)
            records = []
            for i, row in df.iterrows():
                if row['Date'].weekday() == 1:
                    # If after ffill it's still NaN (happens only at the start of historical data), skip
                    if pd.isna(row['Close']):
                        continue
                    
                    report_date = row['Date']
                    
                    # Externalize VWAP calculation for better testing & readability
                    reporting_vwap, close_vs_vwap_pct = self._calculate_vwap_window(df, report_date, row['Close'])

                    db_record = {
                        "contract_id": contract.id,
                        "report_date": report_date,
                        "open_price": float(row['Open']),
                        "high_price": float(row['High']),
                        "low_price": float(row['Low']),
                        "close_price": float(row['Close']),
                        "volume": int(row['Volume']) if not pd.isna(row['Volume']) else 0,
                        "reporting_vwap": float(reporting_vwap) if reporting_vwap is not None else None,
                        "close_vs_vwap_pct": float(close_vs_vwap_pct) if close_vs_vwap_pct is not None else None,
                        "data_source": "yahoo"
                    }
                    records.append(db_record)

            if not records:
                continue

            # 4. Upsert to PostgreSQL
            stmt = insert(WeeklyPrice).values(records)
            update_cols = {
                col.name: col 
                for col in stmt.excluded 
                if col.name not in ['id', 'contract_id', 'report_date']
            }
            upsert_stmt = stmt.on_conflict_do_update(
                constraint='uq_contract_price',
                set_=update_cols
            )

            try:
                self.db.execute(upsert_stmt)
                self.db.commit()
                logger.success(f"Upserted {len(records)} price records (FFILL applied) for {contract.contract_name}")
            except Exception as e:
                self.db.rollback()
                logger.error(f"Error saving prices for {contract.contract_name}: {e}")

    def _calculate_vwap_window(self, df: pd.DataFrame, report_date, close_price):
        """
        Calculates the VWAP for the reporting window (Previous Wednesday -> Report Tuesday).
        Returns (vwap, close_vs_vwap_pct).
        """
        # The window includes: Wed, Thu, Fri, Mon, Tue (5 ideal trading days)
        # Use timedelta to find the previous Wednesday
        prev_wednesday = report_date - timedelta(days=6)
        
        # DataFrame slice for the window
        window_mask = (df['Date'] >= prev_wednesday) & (df['Date'] <= report_date)
        window_df = df.loc[window_mask].copy() # Copy to avoid SettingWithCopyWarning
        
        reporting_vwap = None
        close_vs_vwap_pct = None
        
        if not window_df.empty and window_df['Volume'].sum() > 0:
            # VWAP = Sum(Typical Price * Volume) / Sum(Volume)
            # Typical Price = (High + Low + Close) / 3
            # Ensure using the correct column names as in the original DataFrame
            window_df['Typical_Price'] = (window_df['High'] + window_df['Low'] + window_df['Close']) / 3
            window_df['PV'] = window_df['Typical_Price'] * window_df['Volume']
            
            total_pv = window_df['PV'].sum()
            total_vol = window_df['Volume'].sum()
            
            if total_vol > 0:
                reporting_vwap = total_pv / total_vol
                
                # % Close vs VWAP Calculation
                if reporting_vwap != 0 and close_price is not None:
                    close_vs_vwap_pct = ((close_price - reporting_vwap) / reporting_vwap) * 100
                    
        return reporting_vwap, close_vs_vwap_pct

    def fetch_and_load_daily_prices(self, days_back: int = 365):
        """
        Fetch and store daily OHLCV data for technical analysis.
        Unlike the weekly loader, this stores ALL trading days.
        """
        from app.models.daily_price import DailyPrice
        
        contracts = self.db.query(Contract).filter(Contract.yahoo_ticker != None).all()
        
        for contract in contracts:
            logger.info(f"Fetching daily prices for {contract.contract_name} ({contract.yahoo_ticker})...")
            
            ticker = yf.Ticker(contract.yahoo_ticker)
            end_date = datetime.now()
            start_date = end_date - timedelta(days=days_back)
            
            df = ticker.history(start=start_date, end=end_date, interval="1d")
            
            if df.empty:
                logger.warning(f"No daily price data found for {contract.yahoo_ticker}")
                continue
            
            # Remove timezone for DB compatibility
            df.index = df.index.tz_localize(None)
            df = df.reset_index().rename(columns={'Date': 'date'})
            df['date'] = df['date'].dt.date
            
            # Prepare records for upsert
            records = []
            for _, row in df.iterrows():
                if pd.isna(row['Close']):
                    continue
                
                db_record = {
                    "contract_id": contract.id,
                    "date": row['date'],
                    "open_price": float(row['Open']),
                    "high_price": float(row['High']),
                    "low_price": float(row['Low']),
                    "close_price": float(row['Close']),
                    "volume": int(row['Volume']) if not pd.isna(row['Volume']) else 0,
                    "data_source": "yahoo"
                }
                records.append(db_record)
            
            if not records:
                continue
            
            # Upsert to PostgreSQL
            stmt = insert(DailyPrice).values(records)
            update_cols = {
                col.name: col 
                for col in stmt.excluded 
                if col.name not in ['id', 'contract_id', 'date']
            }
            upsert_stmt = stmt.on_conflict_do_update(
                constraint='uq_contract_daily_price',
                set_=update_cols
            )
            
            try:
                self.db.execute(upsert_stmt)
                self.db.commit()
                logger.success(f"Upserted {len(records)} daily price records for {contract.contract_name}")
            except Exception as e:
                self.db.rollback()
                logger.error(f"Error saving daily prices for {contract.contract_name}: {e}")
