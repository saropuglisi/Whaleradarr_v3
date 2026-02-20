import pandas as pd
import numpy as np
from sqlalchemy.orm import Session
from sqlalchemy import select
from loguru import logger
from app.models.contract import Contract
from app.models.report import WeeklyReport
from app.models.statistics import ContractStatistics
from app.models.alert import WhaleAlert
from app.models.price import WeeklyPrice

class AnalyzerService:
    def __init__(self, db: Session):
        self.db = db

    def update_contract_statistics(self, contract_id: int, lookback_window: int = 156): # 3 Years (~156 weeks)
        """
        Calculates and updates statistics (Median, IQR, Min, Max) for a contract.
        Uses a moving window (lookback_window) for Robust Z-Score.
        """
        logger.info(f"Updating statistics for contract {contract_id}...")
        
        # 1. Fetch Historical Data
        reports = self.db.query(WeeklyReport).filter(
            WeeklyReport.contract_id == contract_id
        ).order_by(WeeklyReport.report_date.asc()).all()
        
        if not reports:
            logger.warning(f"No reports found for contract {contract_id}")
            return

        # Convert to DataFrame
        data = []
        for r in reports:
            data.append({
                "date": r.report_date,
                "dealer_net": r.dealer_net,
                "asset_mgr_net": r.asset_mgr_net,
                "lev_money_net": r.lev_net,
                "lev_money_long": r.lev_long,
                "lev_money_short": r.lev_short,
                "lev_gross": r.lev_gross_exposure
            })
        
        df = pd.DataFrame(data)
        
        if len(df) < 52: # At least 1 year of data for meaningful statistics
            logger.warning(f"Insufficient data for contract {contract_id} (rows={len(df)})")
            # Proceed anyway but with caution... or return? Spec doesn't specify.
            # Let's do best effort.
        
        # 2. Calculate Statistics for each Category
        # Categories to track for Z-Score and COT Index
        categories = {
            ('dealer', 'net'): df['dealer_net'],
            ('asset_mgr', 'net'): df['asset_mgr_net'],
            ('lev_money', 'net'): df['lev_money_net'],
            ('lev_money', 'long'): df['lev_money_long'],
            ('lev_money', 'short'): df['lev_money_short'],
            ('lev_money', 'gross'): df['lev_gross']
        }

        for (cat_name, pos_type), series in categories.items():
            # Last N periods for Rolling Stats
            # If the series is shorter than the window, use everything
            window_data = series.tail(lookback_window)
            
            # Robust Stats Calculation (Median / IQR)
            median = window_data.median()
            q1 = window_data.quantile(0.25)
            q3 = window_data.quantile(0.75)
            iqr = q3 - q1
            
            # Min/Max Calculation (COT Index on a longer window? Or the same? Often 3-5 years)
            # Use all available historical data for Min/Max COT Index for now
            all_min = series.min()
            all_max = series.max()
            
            # 3. Upsert ContractStatistics
            self._save_statistics(contract_id, cat_name, pos_type, median, iqr, all_min, all_max)
            
        logger.success(f"Statistics updated for contract {contract_id}")

    def _save_statistics(self, contract_id, cat, pos, median, iqr, min_val, max_val):
        """Saves or updates statistics in the DB"""
        # Search for existing record
        stat = self.db.query(ContractStatistics).filter(
            ContractStatistics.contract_id == contract_id,
            ContractStatistics.trader_category == cat,
            ContractStatistics.position_type == pos
        ).first()

        if not stat:
            stat = ContractStatistics(
                contract_id=contract_id,
                trader_category=cat,
                position_type=pos
            )
            self.db.add(stat)
        
        stat.rolling_median = float(median)
        stat.rolling_iqr = float(iqr)
        stat.all_time_min = float(min_val)
        stat.all_time_max = float(max_val)
        
        try:
            self.db.commit()
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to save stats: {e}")

    def generate_alerts(self, contract_id: int):
        """
        Generates alerts for the last available report by comparing it with statistics.
        """
        logger.info(f"Generating alerts for contract {contract_id}...")
        
        # 1. Fetch Last Report & Price
        report = self.db.query(WeeklyReport).filter(
            WeeklyReport.contract_id == contract_id
        ).order_by(WeeklyReport.report_date.desc()).first()
        
        if not report:
            logger.warning("No reports found.")
            return

        price = self.db.query(WeeklyPrice).filter(
            WeeklyPrice.contract_id == contract_id,
            WeeklyPrice.report_date == report.report_date
        ).first()

        # 2. Fetch Statistics (Focus on Leveraged Funds aka Whales)
        stats = self.db.query(ContractStatistics).filter(
            ContractStatistics.contract_id == contract_id,
            ContractStatistics.trader_category == 'lev_money',
            ContractStatistics.position_type == 'net'
        ).first()
        
        if not stats: 
            logger.warning("No statistics found for Leveraged Funds.")
            return
            
        # 3. Metric Calculation
        current_val = report.lev_net
        
        # Robust Z-Score
        # Z = (Value - Median) / (IQR * 0.7413)
        iqr_scale = float(stats.rolling_iqr) * 0.7413
        z_score = 0.0
        if iqr_scale > 0:
            z_score = (float(current_val) - float(stats.rolling_median)) / iqr_scale
            
        # COT Index
        # (Value - Min) / (Max - Min) * 100
        cot_index = 50.0
        denom = float(stats.all_time_max) - float(stats.all_time_min)
        if denom > 0:
            cot_index = (float(current_val) - float(stats.all_time_min)) / denom * 100
            
        # 4. Context & Logic
        price_context = "Neutral"
        if price and price.close_vs_vwap_pct is not None:
            # If Close > VWAP = Strength (Markup)
            # If Close < VWAP = Weakness (Markdown/Accumulation?)
            if price.close_price > price.reporting_vwap:
                price_context = "Strength/Markup"
            else:
                price_context = "Weakness/Absorption"

        # 5. Alert Level Determination
        alert_level = "Low"
        confidence = 50.0
        
        # Simple Logic for MVP
        abs_z = abs(z_score)
        if abs_z > 2.0:
            alert_level = "High"
            confidence += 30
        elif abs_z > 1.0:
            alert_level = "Medium"
            confidence += 10
            
        if cot_index > 90 or cot_index < 10:
            confidence += 10
        
        if report.is_rollover_week:
            alert_level = "Low (Rollover)"
            confidence = 10.0 # Low confidence during rollover
            
        # 6. Salva Alert
        alert = WhaleAlert(
            contract_id=contract_id,
            report_date=report.report_date,
            alert_level=alert_level,
            z_score=z_score,
            cot_index=cot_index,
            price_context=price_context,
            confidence_score=confidence,
            is_rollover_week=report.is_rollover_week
        )
        
        # Rimuovi vecchi alert per la stessa data (idempotenza)
        self.db.query(WhaleAlert).filter(
            WhaleAlert.contract_id == contract_id,
            WhaleAlert.report_date == report.report_date
        ).delete()
        
        self.db.add(alert)
        
        try:
            self.db.commit()
            logger.success(f"Generated Alert for {contract_id}: Level={alert_level}, Z={z_score:.2f}")
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to save alert: {e}")
