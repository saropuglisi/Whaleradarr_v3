from sqlalchemy import Column, Integer, BigInteger, Date, Boolean, ForeignKey, Computed, UniqueConstraint, Float
from sqlalchemy.orm import relationship
from app.db.base import Base

class WeeklyReport(Base):
    __tablename__ = "weekly_reports"

    id = Column(Integer, primary_key=True, index=True)
    contract_id = Column(Integer, ForeignKey("contracts.id", ondelete="CASCADE"), nullable=False)
    report_date = Column(Date, nullable=False, index=True)
    
    # --- DEALER ---
    dealer_long = Column(BigInteger, default=0)
    dealer_long_chg = Column(BigInteger, default=0)
    dealer_short = Column(BigInteger, default=0)
    dealer_short_chg = Column(BigInteger, default=0)
    dealer_spread = Column(BigInteger, default=0)
    dealer_net = Column(BigInteger, Computed("dealer_long - dealer_short", persisted=True))
    dealer_ls_ratio = Column(Float, default=1.0)
    
    # --- ASSET MANAGER ---
    asset_mgr_long = Column(BigInteger, default=0)
    asset_mgr_long_chg = Column(BigInteger, default=0)
    asset_mgr_short = Column(BigInteger, default=0)
    asset_mgr_short_chg = Column(BigInteger, default=0)
    asset_mgr_spread = Column(BigInteger, default=0)
    asset_mgr_net = Column(BigInteger, Computed("asset_mgr_long - asset_mgr_short", persisted=True))
    asset_mgr_ls_ratio = Column(Float, default=1.0)
    
    # --- LEVERAGED FUNDS (Whales) ---
    lev_long = Column(BigInteger, default=0)
    lev_long_chg = Column(BigInteger, default=0)
    lev_short = Column(BigInteger, default=0)
    lev_short_chg = Column(BigInteger, default=0)
    lev_spread = Column(BigInteger, default=0)
    lev_net = Column(BigInteger, Computed("lev_long - lev_short", persisted=True))
    lev_ls_ratio = Column(Float, default=1.0)
    
    # Gross Exposure
    lev_gross_exposure = Column(BigInteger, Computed("lev_long + lev_short", persisted=True))
    
    # --- MARKET & RETAIL ---
    non_report_long = Column(BigInteger, default=0)
    non_report_short = Column(BigInteger, default=0)
    open_interest = Column(BigInteger, nullable=False)
    open_interest_chg = Column(BigInteger, default=0)
    
    is_rollover_week = Column(Boolean, default=False)
    contract = relationship("Contract", back_populates="reports")

    __table_args__ = (
        UniqueConstraint('contract_id', 'report_date', name='uq_contract_report_date'),
    )
