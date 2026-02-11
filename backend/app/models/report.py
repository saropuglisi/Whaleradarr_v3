from sqlalchemy import Column, Integer, BigInteger, Date, Boolean, ForeignKey, Computed, UniqueConstraint
from sqlalchemy.orm import relationship
from app.db.base import Base

class WeeklyReport(Base):
    __tablename__ = "weekly_reports"

    id = Column(Integer, primary_key=True, index=True)
    contract_id = Column(Integer, ForeignKey("contracts.id", ondelete="CASCADE"), nullable=False)
    report_date = Column(Date, nullable=False, index=True)
    
    # Dealer
    dealer_long = Column(BigInteger, default=0)
    dealer_short = Column(BigInteger, default=0)
    dealer_spread = Column(BigInteger, default=0)
    
    # Asset Manager
    asset_mgr_long = Column(BigInteger, default=0)
    asset_mgr_short = Column(BigInteger, default=0)
    asset_mgr_spread = Column(BigInteger, default=0)
    
    # Leveraged Funds
    lev_long = Column(BigInteger, default=0)
    lev_short = Column(BigInteger, default=0)
    lev_spread = Column(BigInteger, default=0)
    
    # Gross Exposure (Computed)
    lev_gross_exposure = Column(
        BigInteger, 
        Computed("lev_long + lev_short", persisted=True)
    )
    
    # Retail Proxy
    non_report_long = Column(BigInteger, default=0)
    non_report_short = Column(BigInteger, default=0)
    
    open_interest = Column(BigInteger, nullable=False)
    is_rollover_week = Column(Boolean, default=False)

    contract = relationship("Contract", back_populates="reports")

    # CRITICAL: Constraint name deve matchare quello usato nel Loader
    __table_args__ = (
        UniqueConstraint('contract_id', 'report_date', name='uq_contract_report_date'),
    )
