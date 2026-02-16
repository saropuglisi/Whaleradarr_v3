from typing import List, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, extract, desc
from datetime import datetime, timedelta

from app.db.session import SessionLocal
from app.models.contract import Contract
from app.models.report import WeeklyReport
from app.models.report import WeeklyReport

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/heatmap")
def get_market_heatmap(
    weeks: int = Query(12, ge=4, le=52),
    category: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Get Heatmap data: COT Index for all active contracts over the last N weeks.
    Returns matrix: Contracts x Weeks.
    """
    # 1. Get active contracts
    query = db.query(Contract).filter(Contract.is_active == True)
    if category:
        query = query.filter(Contract.market_category == category)
    
    contracts = query.all()
    contract_ids = [c.id for c in contracts]
    
    if not contract_ids:
        return {"weeks": [], "data": []}

    # 2. Calculate date range
    end_date = datetime.now().date()
    start_date = end_date - timedelta(weeks=weeks + 4) # Buffer for rolling calculations if needed
    
    # 3. Fetch Weekly Reports for these contracts
    # We need to calculate COT Index on the fly or fetch it if stored. 
    # Since we don't store COT Index in WeeklyReport (it's in WhaleAlert), 
    # we might need to compute it or fetch from WhaleAlerts if available for every week.
    # However, WhaleAlerts are only for "Signals". 
    # A proper heatmap needs values for EVERY week, not just alerts.
    # So we must calculate COT Index (Term = 0-100 position in range).
    
    # Let's fetch Reports
    reports = db.query(
        WeeklyReport.contract_id,
        WeeklyReport.report_date,
        WeeklyReport.asset_mgr_net,
        WeeklyReport.lev_net,
        WeeklyReport.dealer_net
    ).filter(
        WeeklyReport.contract_id.in_(contract_ids),
        WeeklyReport.report_date >= start_date
    ).order_by(WeeklyReport.report_date.desc()).all()
    
    # We need a longer lookback to calculate Min/Max for COT Index (typically 3 years / 156 weeks)
    # This is expensive to do on-the-fly for all contracts.
    # ALTERNATIVE: Use `statistics` table which has `all_time_min/max` or calculated stats?
    # Or just fetch simplified data?
    
    # Optimized approach:
    # 1. Fetch 3-year min/max for each contract (pre-calculated or separate query).
    # 2. Fetch last N weeks of net positions.
    # 3. Compute Index = (Current - Min) / (Max - Min) * 100
    
    # Let's try to get min/max from last 3 years efficiently
    lookback_date = end_date - timedelta(weeks=156)
    
    min_max_query = db.query(
        WeeklyReport.contract_id,
        func.min(WeeklyReport.asset_mgr_net).label('min_net'),
        func.max(WeeklyReport.asset_mgr_net).label('max_net')
    ).filter(
        WeeklyReport.contract_id.in_(contract_ids),
        WeeklyReport.report_date >= lookback_date
    ).group_by(WeeklyReport.contract_id).all()
    
    min_max_map = {r.contract_id: {'min': r.min_net, 'max': r.max_net} for r in min_max_query}
    
    # Organize reports by contract and date
    heatmap_data = []
    
    # Unique dates (weeks) found in the requested range
    week_dates = sorted(list(set([r.report_date.strftime("%Y-%m-%d") for r in reports if r.report_date >= (end_date - timedelta(weeks=weeks+1))])))
    # Limit to requested weeks (newest N)
    week_dates = week_dates[-weeks:]
    
    for contract in contracts:
        c_stats = min_max_map.get(contract.id)
        if not c_stats:
            continue
            
        if c_stats['min'] is None or c_stats['max'] is None:
            # Skip contracts with insufficient data
            heatmap_data.append({
                "contract_id": contract.id,
                "contract_name": contract.contract_name,
                "category": contract.market_category,
                "data": []
            })
            continue
            
        c_min = float(c_stats['min'])
        c_max = float(c_stats['max'])
        divisor = c_max - c_min if c_max != c_min else 1.0
        
        # Get reports for this contract
        c_reports = [r for r in reports if r.contract_id == contract.id]
        
        # Build series
        series = []
        for date_str in week_dates:
            report = next((r for r in c_reports if r.report_date.strftime("%Y-%m-%d") == date_str), None)
            
            val = None
            if report:
                net = float(report.asset_mgr_net)
                # Calculate COT Index
                cot_index = ((net - c_min) / divisor) * 100
                cot_index = max(0, min(100, cot_index)) # Clamp 0-100
                val = round(cot_index, 1)
                
            series.append({
                "date": date_str,
                "value": val
            })
            
        heatmap_data.append({
            "contract_id": contract.id,
            "contract_name": contract.contract_name,
            "category": contract.market_category,
            "data": series
        })
        
    return {
        "weeks": week_dates,
        "heatmap": heatmap_data
    }
