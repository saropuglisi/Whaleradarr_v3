from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.db.session import SessionLocal
from app.models.alert import WhaleAlert
from app.models.contract import Contract
from app.models.report import WeeklyReport
from app.schemas.alert import WhaleAlertSchema

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
    Get latest Whale Alerts.
    """
    query = db.query(WhaleAlert).join(Contract)
    
    if level:
        query = query.filter(WhaleAlert.alert_level == level)
        
    if min_confidence > 0:
        query = query.filter(WhaleAlert.confidence_score >= min_confidence)

    # Eager load contract to display name? 
    # Or just use the model field if we add it. 
    # For now, let's just return the alert objects.
    # If we want contract_name in response, we need to handle it.
    
    alerts = query.order_by(
        WhaleAlert.report_date.desc(), 
        WhaleAlert.confidence_score.desc()
    ).offset(skip).limit(limit).all()
    
    # Enrich with contract_name, delta, and report
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
        # Find the most recent alert for this contract BEFORE this report_date
        prev_alert = db.query(WhaleAlert).filter(
            WhaleAlert.contract_id == alert.contract_id,
            WhaleAlert.report_date < alert.report_date
        ).order_by(WhaleAlert.report_date.desc()).first()

        if prev_alert and alert.z_score is not None and prev_alert.z_score is not None:
            alert_data.z_score_delta = float(alert.z_score) - float(prev_alert.z_score)
        else:
            alert_data.z_score_delta = None

        results.append(alert_data)
        
    return results
