from pydantic import BaseModel
from datetime import date
from typing import Optional

class WeeklyReportSchema(BaseModel):
    id: int
    contract_id: int
    report_date: date
    
    # Dealer
    dealer_long: int
    dealer_long_chg: int
    dealer_short: int
    dealer_short_chg: int
    dealer_net: int
    
    # Asset Manager
    asset_mgr_long: int
    asset_mgr_long_chg: int
    asset_mgr_short: int
    asset_mgr_short_chg: int
    asset_mgr_net: int
    
    # Leveraged Funds
    lev_long: int
    lev_long_chg: int
    lev_short: int
    lev_short_chg: int
    lev_net: int
    
    open_interest: int
    open_interest_chg: int

    class Config:
        from_attributes = True
