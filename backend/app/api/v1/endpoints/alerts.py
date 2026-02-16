from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.db.session import SessionLocal
from app.models.alert import WhaleAlert
from app.models.contract import Contract
from app.models.report import WeeklyReport
from app.schemas.alert import WhaleAlertSchema
from app.services.analysis.technical import TechnicalAnalyzer

router = APIRouter()

def get_db():
    try:
        db = SessionLocal()
        yield db
    finally:
        db.close()

@router.get("/", response_model=List[WhaleAlertSchema])
def get_alerts(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 50,
    level: Optional[str] = Query(None, description="Filter by Alert Level (High, Medium, Low)"),
    min_confidence: Optional[float] = Query(0, description="Minimum Confidence Score (0-100)")
):
    """
    Get latest Whale Alerts with technical timing signals.
    """
    query = db.query(WhaleAlert).join(Contract)
    
    if level:
        query = query.filter(WhaleAlert.alert_level == level)
        
    if min_confidence > 0:
        query = query.filter(WhaleAlert.confidence_score >= min_confidence)

    alerts = query.order_by(
        WhaleAlert.report_date.desc(), 
        WhaleAlert.confidence_score.desc()
    ).offset(skip).limit(limit).all()
    
    # Initialize TechnicalAnalyzer
    tech_analyzer = TechnicalAnalyzer(db)
    
    # Enrich with contract_name, delta, report, and technical signals
    results = []
    for alert in alerts:
        alert_data = WhaleAlertSchema.model_validate(alert)
        alert_data.contract_name = alert.contract.contract_name if alert.contract else "Unknown"

        # Fetch Weekly Report
        report = db.query(WeeklyReport).filter(
            WeeklyReport.contract_id == alert.contract_id,
            WeeklyReport.report_date == alert.report_date
        ).first()
        alert_data.report = report

        # Calculate Z-Score Delta
        prev_alert = db.query(WhaleAlert).filter(
            WhaleAlert.contract_id == alert.contract_id,
            WhaleAlert.report_date < alert.report_date
        ).order_by(WhaleAlert.report_date.desc()).first()

        if prev_alert and alert.z_score is not None and prev_alert.z_score is not None:
            alert_data.z_score_delta = float(alert.z_score) - float(prev_alert.z_score)
        else:
            alert_data.z_score_delta = None

        # Add Technical Timing Signal (only if daily data exists)
        try:
            # Check if any daily prices exist for this contract
            from app.models.daily_price import DailyPrice
            has_daily_data = db.query(DailyPrice).filter(
                DailyPrice.contract_id == alert.contract_id
            ).limit(1).first() is not None
            
            if has_daily_data:
                timing_signal = tech_analyzer.generate_timing_signal(alert.contract_id)
                alert_data.technical_signal = timing_signal.get('signal', 'Unknown')
                alert_data.technical_context = {
                    'rsi': timing_signal.get('rsi'),
                    'trend': timing_signal.get('trend'),
                    'ema_50': timing_signal.get('ema_50'),
                    'ema_200': timing_signal.get('ema_200')
                }
            else:
                # No daily price data available yet
                alert_data.technical_signal = "No Data"
                alert_data.technical_context = {}
        except Exception as e:
            # If technical analysis fails, don't break the entire response
            from loguru import logger
            logger.warning(f"Technical analysis failed for contract {alert.contract_id}: {e}")
            alert_data.technical_signal = "N/A"
            alert_data.technical_context = {}

        results.append(alert_data)
        
    return results
