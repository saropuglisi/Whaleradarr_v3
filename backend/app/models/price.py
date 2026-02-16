from sqlalchemy import Column, Integer, BigInteger, String, Date, DECIMAL, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.db.base import Base

class WeeklyPrice(Base):
    __tablename__ = "weekly_prices"

    id = Column(Integer, primary_key=True, index=True)
    contract_id = Column(Integer, ForeignKey("contracts.id", ondelete="CASCADE"), nullable=False)
    report_date = Column(Date, nullable=False) # Matches COT report_date (Tuesday)
    
    # OHLC for the Tuesday
    open_price = Column(DECIMAL(16, 6), nullable=True)
    high_price = Column(DECIMAL(16, 6), nullable=True)
    low_price = Column(DECIMAL(16, 6), nullable=True)
    close_price = Column(DECIMAL(16, 6), nullable=True)
    
    # Extra technical metrics
    reporting_vwap = Column(DECIMAL(16, 6), nullable=True) # VWAP Wed -> Tue
    close_vs_vwap_pct = Column(DECIMAL(10, 2), nullable=True)
    volume = Column(BigInteger, default=0)
    
    data_source = Column(String(20), nullable=True) # "yahoo"

    contract = relationship("Contract", back_populates="prices")

    __table_args__ = (
        UniqueConstraint('contract_id', 'report_date', name='uq_contract_price'),
    )
