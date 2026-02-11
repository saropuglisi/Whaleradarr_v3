from sqlalchemy import Column, Integer, String, Date, DECIMAL, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.db.base import Base

class WeeklyPrice(Base):
    __tablename__ = "weekly_prices"

    id = Column(Integer, primary_key=True, index=True)
    contract_id = Column(Integer, ForeignKey("contracts.id", ondelete="CASCADE"), nullable=False)
    report_date = Column(Date, nullable=False) # Matches report_date
    
    close_price = Column(DECIMAL(12, 4), nullable=True) # Price on report_date (Tuesday)
    reporting_vwap = Column(DECIMAL(12, 4), nullable=True) # VWAP Wed -> Tue
    close_vs_vwap_pct = Column(DECIMAL(10, 2), nullable=True)
    data_source = Column(String(20), nullable=True) # "yahoo", "alpha_vantage"

    contract = relationship("Contract", back_populates="prices")

    __table_args__ = (
        UniqueConstraint('contract_id', 'report_date', name='uq_contract_price'),
    )
