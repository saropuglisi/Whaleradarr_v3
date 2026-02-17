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

class ContractReportSummarySchema(BaseModel):
    id: int
    report_date: date
    
    # Dealer
    dealer_long: int = 0
    dealer_short: int = 0
    dealer_net: int = 0
    dealer_long_chg: int = 0
    dealer_short_chg: int = 0
    
    # Asset Manager
    asset_mgr_long: int = 0
    asset_mgr_short: int = 0
    asset_mgr_net: int = 0
    asset_mgr_long_chg: int = 0
    asset_mgr_short_chg: int = 0
    
    # Leveraged Funds
    lev_long: int = 0
    lev_short: int = 0
    lev_net: int = 0
    lev_long_chg: int = 0
    lev_short_chg: int = 0
    
    # OI
    open_interest: int
    open_interest_chg: int = 0

    class Config:
        from_attributes = True

class ContractSchema(BaseModel):
    id: int
    cftc_contract_code: str
    contract_name: str
    market_category: str
    yahoo_ticker: Optional[str]
    is_active: bool
    latest_report: Optional[ContractReportSummarySchema] = None
    
    class Config:
        from_attributes = True

class ContractDetailSchema(ContractSchema):
    # Include stats only in detail view
    statistics: List[ContractStatsSchema] = []
