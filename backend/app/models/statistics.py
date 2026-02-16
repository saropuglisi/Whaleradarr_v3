from sqlalchemy import Column, Integer, String, DECIMAL, ForeignKey, UniqueConstraint
from app.db.base import Base

class ContractStatistics(Base):
    __tablename__ = "contract_statistics"

    id = Column(Integer, primary_key=True, index=True)
    contract_id = Column(Integer, ForeignKey("contracts.id", ondelete="CASCADE"), nullable=False)
    
    trader_category = Column(String(20), nullable=False) # "dealer", "asset_mgr", "lev_money"
    position_type = Column(String(10), nullable=False)   # "long", "short", "net"
    
    rolling_median = Column(DECIMAL(15, 2))
    rolling_iqr = Column(DECIMAL(15, 2))
    all_time_min = Column(DECIMAL(15, 2))
    all_time_max = Column(DECIMAL(15, 2))
    
    __table_args__ = (
        UniqueConstraint('contract_id', 'trader_category', 'position_type', name='uq_contract_stats'),
    )
