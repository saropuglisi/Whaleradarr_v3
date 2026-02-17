import yfinance as yf
import pandas as pd
import numpy as np
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from loguru import logger
from app.models.contract import Contract
from app.models.price import WeeklyPrice
from app.models.report import WeeklyReport

class COTStalenessService:
    def __init__(self, db: Session):
        self.db = db

    def calculate_score(self, contract_id: int) -> dict:
        """
        Calculates the COT Staleness Confidence Score based on:
        1. Price Displacement (vs COT Report Close)
        2. Intraday Volatility Spike (Current ATR vs Historical ATR)
        3. Volume Anomaly (Z-Score)
        4. Time Decay (Days since report)
        """
        
        # 1. Fetch Contract & Last Report Info
        contract = self.db.query(Contract).filter(Contract.id == contract_id).first()
        if not contract or not contract.yahoo_ticker:
            return {"error": "Contract not found or missing Yahoo Ticker"}

        last_report = self.db.query(WeeklyReport).filter(
            WeeklyReport.contract_id == contract_id
        ).order_by(WeeklyReport.report_date.desc()).first()

        if not last_report:
            return {"error": "No COT report found"}

        # Fetch Reference Price (Close price on Report Date - Tuesday)
        ref_price_record = self.db.query(WeeklyPrice).filter(
            WeeklyPrice.contract_id == contract_id,
            WeeklyPrice.report_date == last_report.report_date
        ).first()

        cot_reference_price = float(ref_price_record.close_price) if ref_price_record else None
        
        # 2. Fetch Real-time Market Data from Yahoo Finance
        try:
            ticker = yf.Ticker(contract.yahoo_ticker)
            # Fetch recent history for ATR and Volume stats (last 60 days)
            hist = ticker.history(period="3mo", interval="1d")
            
            if hist.empty:
                 return {"error": "No market data available"}
                 
            current_price = hist['Close'].iloc[-1]
            current_volume = hist['Volume'].iloc[-1]
            
            # If reference price is missing from DB, try to find it in history
            if cot_reference_price is None:
                # Localize report date to match yahoo index if needed, or string match
                rep_date_str = last_report.report_date.strftime('%Y-%m-%d')
                if rep_date_str in hist.index.strftime('%Y-%m-%d'):
                     cot_reference_price = hist.loc[rep_date_str]['Close']
                else:
                    # Fallback: use close of report date if available, else fail
                    # Usually report date is Tuesday.
                    pass

            if cot_reference_price is None:
                 return {"error": "Reference price not found"}

        except Exception as e:
            logger.error(f"Error fetching market data: {e}")
            return {"error": f"Market data error: {str(e)}"}

        # 3. Calculate Metrics
        
        # A. Price Displacement
        # Needs ATR-14 for normalization
        hist['TR'] = np.maximum(
            hist['High'] - hist['Low'],
            np.maximum(
                abs(hist['High'] - hist['Close'].shift(1)),
                abs(hist['Low'] - hist['Close'].shift(1))
            )
        )
        hist['ATR_14'] = hist['TR'].rolling(window=14).mean()
        
        current_atr_14 = hist['ATR_14'].iloc[-1]
        
        if pd.isna(current_atr_14) or current_atr_14 == 0:
            price_displacement = 0 # Fallback
        else:
            price_displacement = abs(current_price - cot_reference_price) / current_atr_14

        # B. Intraday Volatility Spike
        # Current ATR-5 / Historical ATR-20
        hist['ATR_5'] = hist['TR'].rolling(window=5).mean()
        hist['ATR_20'] = hist['TR'].rolling(window=20).mean()
        
        atr_5 = hist['ATR_5'].iloc[-1]
        atr_20 = hist['ATR_20'].iloc[-1]
        
        if pd.isna(atr_20) or atr_20 == 0:
            vol_spike = 1.0 # Neutral
        else:
            vol_spike = atr_5 / atr_20

        # C. Volume Anomaly (Z-Score)
        # Using 20-day mean/std
        vol_mean = hist['Volume'].rolling(window=20).mean().iloc[-1]
        vol_std = hist['Volume'].rolling(window=20).std().iloc[-1]
        
        if pd.isna(vol_std) or vol_std == 0:
            volume_z = 0.0
        else:
            volume_z = (current_volume - vol_mean) / vol_std

        # D. Days Since Report
        days_since = (datetime.now().date() - last_report.report_date).days
        # If today is weekend, market is closed, staleness might not increase? 
        # But for simplicity, we use calendar days or just user logic.
        # Logic says: decay linearly over 5 working days (1 week)
        
        # 4. Calculate Final Score
        
        # Normalization
        d_price = min(price_displacement / 2.0, 1.0)        # Saturate at 2 ATR
        d_vol   = min(max(vol_spike - 1.0, 0) / 1.0, 1.0)  # > 1.0 only
        d_volume = min(max(volume_z, 0) / 3.0, 1.0)         # Saturate at Z=3
        d_time  = min(days_since / 5.0, 1.0)                # 5 days decay
        
        # Weights
        # Price: 35%, Vol: 25%, Volume: 25%, Time: 15%
        staleness = (
            0.35 * d_price +
            0.25 * d_vol +
            0.25 * d_volume +
            0.15 * d_time
        )
        
        reliability = (1.0 - staleness) * 100.0
        
        # ensure 0-100
        reliability = max(0.0, min(100.0, reliability))

        return {
            "reliability_pct": round(reliability, 1),
            "label": self._classify(reliability),
            "breakdown": {
                "price_displacement": round(d_price, 2),
                "volatility_spike": round(d_vol, 2),
                "volume_anomaly": round(d_volume, 2),
                "time_decay": round(d_time, 2),
                # Metadata for debugging/frontend
                "raw_price_disp": round(price_displacement, 2),
                "raw_vol_spike": round(vol_spike, 2),
                "raw_volume_z": round(volume_z, 2),
                "days_since": days_since,
                "cot_date": last_report.report_date.strftime("%Y-%m-%d"),
                "current_price": round(current_price, 4),
                "reference_price": round(cot_reference_price, 4) if cot_reference_price else None
            }
        }

    def _classify(self, r):
        if r >= 80: return "🟢 High Reliability"
        if r >= 55: return "🟡 Partial Reliability"
        if r >= 30: return "🟠 Caution - Potentially Stale"
        return "🔴 Very Low Reliability"
