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
        """Scarica i prezzi e gestisce i festivi con logica Forward Fill"""
        contracts = self.db.query(Contract).filter(Contract.yahoo_ticker != None).all()
        
        for contract in contracts:
            logger.info(f"Fetching prices for {contract.contract_name} ({contract.yahoo_ticker})...")
            
            ticker = yf.Ticker(contract.yahoo_ticker)
            df = ticker.history(period="max", interval="1d")
            
            if df.empty:
                logger.warning(f"No price data found for {contract.yahoo_ticker}")
                continue

            # 1. Preparazione DataFrame
            df.index = df.index.tz_localize(None) # Rimuoviamo timezone per compatibilità DB
            
            # Creiamo un range completo di date per non perdere i Martedì festivi
            all_dates = pd.date_range(start=df.index.min(), end=df.index.max(), freq='D')
            df = df.reindex(all_dates)
            
            # 2. FORWARD FILL: Se un giorno manca (festivo), prendi il prezzo del giorno prima
            df[['Open', 'High', 'Low', 'Close', 'Volume']] = df[['Open', 'High', 'Low', 'Close', 'Volume']].ffill()
            
            df = df.reset_index().rename(columns={'index': 'Date'})
            df['Date'] = df['Date'].dt.date
            
            # 3. Estrazione dei Martedì (Tuesday = 1)
            records = []
            for i, row in df.iterrows():
                if row['Date'].weekday() == 1:
                    # Se dopo il ffill è ancora NaN (capita solo all'inizio dello storico), saltiamo
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

            # 4. Upsert su PostgreSQL
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
        Calcola il VWAP per la finestra di reporting (Mercoledì precedente -> Martedì report_date).
        Restituisce (vwap, close_vs_vwap_pct).
        """
        # La finestra include: Mer, Gio, Ven, Lun, Mar (5 giorni di trading ideali)
        # Usiamo timedelta per trovare il mercoledì precedente
        prev_wednesday = report_date - timedelta(days=6)
        
        # Slice del DataFrame per la finestra
        window_mask = (df['Date'] >= prev_wednesday) & (df['Date'] <= report_date)
        window_df = df.loc[window_mask].copy() # Copy to avoid SettingWithCopyWarning
        
        reporting_vwap = None
        close_vs_vwap_pct = None
        
        if not window_df.empty and window_df['Volume'].sum() > 0:
            # VWAP = Sum(Typical Price * Volume) / Sum(Volume)
            # Typical Price = (High + Low + Close) / 3
            # Assicuriamoci di usare i nomi colonne corretti come nel DataFrame originale
            window_df['Typical_Price'] = (window_df['High'] + window_df['Low'] + window_df['Close']) / 3
            window_df['PV'] = window_df['Typical_Price'] * window_df['Volume']
            
            total_pv = window_df['PV'].sum()
            total_vol = window_df['Volume'].sum()
            
            if total_vol > 0:
                reporting_vwap = total_pv / total_vol
                
                # Calcolo % Close vs VWAP
                if reporting_vwap != 0 and close_price is not None:
                    close_vs_vwap_pct = ((close_price - reporting_vwap) / reporting_vwap) * 100
                    
        return reporting_vwap, close_vs_vwap_pct
