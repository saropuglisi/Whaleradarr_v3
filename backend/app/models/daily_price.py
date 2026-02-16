from sqlalchemy import Column, Integer, BigInteger, String, Date, DECIMAL, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.db.base import Base

class DailyPrice(Base):
    __tablename__ = "daily_prices"

    id = Column(Integer, primary_key=True, index=True)
    contract_id = Column(Integer, ForeignKey("contracts.id", ondelete="CASCADE"), nullable=False)
    date = Column(Date, nullable=False, index=True)
    
    open_price = Column(DECIMAL(16, 6), nullable=False)
    high_price = Column(DECIMAL(16, 6), nullable=False)
    low_price = Column(DECIMAL(16, 6), nullable=False)
    close_price = Column(DECIMAL(16, 6), nullable=False)
    volume = Column(BigInteger, default=0)
    
    data_source = Column(String(20), default="yahoo")

    contract = relationship("Contract", back_populates="daily_prices")

    __table_args__ = (
        UniqueConstraint('contract_id', 'date', name='uq_contract_daily_price'),
    )
