from pydantic import BaseModel
from typing import Optional, List
from datetime import date

class ContractStatsSchema(BaseModel):
    trader_category: str
    position_type: str
    rolling_median: Optional[float]
    rolling_iqr: Optional[float]
    all_time_min: Optional[float]
    all_time_max: Optional[float]
    
    class Config:
        from_attributes = True

class ContractSchema(BaseModel):
    id: int
    cftc_contract_code: str
    contract_name: str
    market_category: str
    yahoo_ticker: Optional[str]
    is_active: bool
    
    class Config:
        from_attributes = True

class ContractDetailSchema(ContractSchema):
    # Include stats only in detail view
    statistics: List[ContractStatsSchema] = []
