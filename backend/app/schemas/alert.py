from pydantic import BaseModel
from datetime import date
from typing import Optional
from app.schemas.report import WeeklyReportSchema

class WhaleAlertSchema(BaseModel):
    id: int
    contract_id: int
    report_date: date
    alert_level: str
    z_score: Optional[float]
    cot_index: Optional[float]
    price_context: Optional[str]
    confidence_score: Optional[float]
    is_rollover_week: bool
    z_score_delta: Optional[float] = None
    
    report: Optional[WeeklyReportSchema] = None
    
    # Nested contract info (optional, or handled via join in endpoint)
    contract_name: Optional[str] = None

    class Config:
        from_attributes = True
