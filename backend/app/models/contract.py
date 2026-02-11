from sqlalchemy import Column, Integer, String, Boolean, Date, ARRAY, DECIMAL
from sqlalchemy.orm import relationship
from app.db.base import Base
from datetime import datetime

class Contract(Base):
    __tablename__ = "contracts"

    id = Column(Integer, primary_key=True, index=True)
    cftc_contract_code = Column(String(20), unique=True, nullable=False, index=True)
    contract_name = Column(String(255), nullable=False)
    market_category = Column(String(50), nullable=False) # e.g., "stock_index", "crypto"
    
    # Ticker symbols for price data
    yahoo_ticker = Column(String(20), nullable=True)
    alpha_vantage_ticker = Column(String(20), nullable=True)
    exchange = Column(String(50), nullable=True)
    
    # Rollover configuration
    expiry_rule = Column(String(50), nullable=True) # e.g., "third_friday"
    expiry_months = Column(ARRAY(Integer), nullable=True) # e.g., [3, 6, 9, 12]
    contract_unit_value = Column(DECIMAL(12, 2), default=1.0)
    
    is_consolidated = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(Date, default=datetime.utcnow)

    # Relazioni
    reports = relationship("WeeklyReport", back_populates="contract", cascade="all, delete-orphan")
    prices = relationship("WeeklyPrice", back_populates="contract", cascade="all, delete-orphan")
    alerts = relationship("WhaleAlert", back_populates="contract", cascade="all, delete-orphan")
