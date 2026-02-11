from sqlalchemy import Column, Integer, String, Date, DECIMAL, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import Base
from datetime import datetime

class WhaleAlert(Base):
    __tablename__ = "whale_alerts"

    id = Column(Integer, primary_key=True, index=True)
    contract_id = Column(Integer, ForeignKey("contracts.id", ondelete="CASCADE"), nullable=False)
    report_date = Column(Date, nullable=False)
    
    alert_level = Column(String(20), nullable=True) # "High", "Medium", "Low"
    z_score = Column(DECIMAL(10, 4), nullable=True)
    cot_index = Column(DECIMAL(5, 2), nullable=True)
    price_context = Column(String(50), nullable=True) # "Accumulation", "Distribution"
    confidence_score = Column(DECIMAL(5, 2), nullable=True)
    is_rollover_week = Column(Boolean, default=False)
    created_at = Column(Date, default=datetime.utcnow)

    contract = relationship("Contract", back_populates="alerts")
