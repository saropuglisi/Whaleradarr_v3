from typing import List, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, extract


from app.db.session import SessionLocal
from app.models.contract import Contract
from app.models.statistics import ContractStatistics
from app.models.report import WeeklyReport
from app.schemas.contract import ContractSchema, ContractDetailSchema, ContractStatsSchema, ContractReportSummarySchema



router = APIRouter()

def get_db():
    try:
        db = SessionLocal()
        yield db
    finally:
        db.close()

@router.get("/", response_model=List[ContractSchema])
def get_contracts(
    db: Session = Depends(get_db),
    active_only: bool = True
):
    """
    Get list of contracts with their latest report.
    """
    # Subquery to get latest report date per contract
    # We need to explicitly order by date to ensure we get the absolute latest
    subquery = db.query(
        WeeklyReport.contract_id,
        func.max(WeeklyReport.report_date).label('max_date')
    ).group_by(WeeklyReport.contract_id).subquery()

    # Query contracts and join with the specific report that matches the max date
    results = db.query(Contract, WeeklyReport).outerjoin(
        subquery, Contract.id == subquery.c.contract_id
    ).outerjoin(
        WeeklyReport,
        (WeeklyReport.contract_id == Contract.id) & 
        (WeeklyReport.report_date == subquery.c.max_date)
    )

    if active_only:
        results = results.filter(Contract.is_active == True)
    
    # Sort by market category and then name
    results = results.order_by(Contract.market_category, Contract.contract_name).all()

    # Manually construct response to include nested report
    contracts_list = []
    for contract, report in results:
        contract_data = ContractSchema.model_validate(contract)
        if report:
            contract_data.latest_report = ContractReportSummarySchema.model_validate(report)
        contracts_list.append(contract_data)
        
    return contracts_list

@router.get("/{contract_id}", response_model=ContractDetailSchema)
def get_contract_detail(
    contract_id: int,
    db: Session = Depends(get_db)
):
    """
    Get contract details including statistics.
    """
    contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
        
    # Manual validation to shape the response with nested stats
    # Assuming we don't have a direct relationship back in the model for stats yet...
    # Oh wait, we didn't add relationship in models/contract.py for stats!
    # Let's fetch manually.
    
    stats = db.query(ContractStatistics).filter(ContractStatistics.contract_id == contract_id).all()
    
    # Create response object
    response = ContractDetailSchema.model_validate(contract)
    
    # Map stats to schema
    stats_list = []
    for s in stats:
        stats_list.append(ContractStatsSchema.model_validate(s))
        
    response.statistics = stats_list
    
    return response

@router.get("/{contract_id}/history")
def get_contract_history(
    contract_id: int,
    db: Session = Depends(get_db),
    weeks_back: int = 260  # 5 years of historical data
):
    """
    Get historical data for a specific contract including:
    - Historical weekly reports (last N weeks)
    - Historical alerts
    - Price data
    """
    from app.models.report import WeeklyReport
    from app.models.alert import WhaleAlert
    from app.models.price import WeeklyPrice
    from datetime import datetime, timedelta
    
    # Verify contract exists
    contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    # Calculate date range
    end_date = datetime.now().date()
    start_date = end_date - timedelta(weeks=weeks_back)
    
    # Fetch historical weekly reports
    reports = db.query(WeeklyReport).filter(
        WeeklyReport.contract_id == contract_id,
        WeeklyReport.report_date >= start_date
    ).order_by(WeeklyReport.report_date.desc()).all()
    
    # Fetch historical alerts
    alerts = db.query(WhaleAlert).filter(
        WhaleAlert.contract_id == contract_id,
        WhaleAlert.report_date >= start_date
    ).order_by(WhaleAlert.report_date.desc()).all()
    
    # Fetch price data
    prices = db.query(WeeklyPrice).filter(
        WeeklyPrice.contract_id == contract_id,
        WeeklyPrice.report_date >= start_date
    ).order_by(WeeklyPrice.report_date.desc()).all()
    
    # Format response
    return {
        "contract_id": contract_id,
        "contract_name": contract.contract_name,
        "historical_reports": [
            {
                "report_date": report.report_date.isoformat(),
                "dealer_long": float(report.dealer_long),
                "dealer_short": float(report.dealer_short),
                "dealer_net": float(report.dealer_net),
                "asset_mgr_long": float(report.asset_mgr_long),
                "asset_mgr_short": float(report.asset_mgr_short),
                "asset_mgr_net": float(report.asset_mgr_net),
                "lev_long": float(report.lev_long),
                "lev_short": float(report.lev_short),
                "lev_net": float(report.lev_net),
                "non_report_long": float(report.non_report_long) if report.non_report_long else 0,
                "non_report_short": float(report.non_report_short) if report.non_report_short else 0,
                "open_interest": float(report.open_interest)
            }
            for report in reports
        ],
        "historical_alerts": [
            {
                "id": alert.id,
                "report_date": alert.report_date.isoformat(),
                "alert_level": alert.alert_level,
                "z_score": float(alert.z_score) if alert.z_score else None,
                "cot_index": float(alert.cot_index) if alert.cot_index else None,
                "price_context": alert.price_context,
                "confidence_score": float(alert.confidence_score) if alert.confidence_score else None
            }
            for alert in alerts
        ],
        "price_history": [
            {
                "report_date": price.report_date.isoformat(),
                "open_price": float(price.open_price) if price.open_price else None,
                "high_price": float(price.high_price) if price.high_price else None,
                "low_price": float(price.low_price) if price.low_price else None,
                "close_price": float(price.close_price),
                "reporting_vwap": float(price.reporting_vwap) if price.reporting_vwap else None,
                "close_vs_vwap_pct": float(price.close_vs_vwap_pct) if price.close_vs_vwap_pct else None
            }
            for price in prices
        ]
    }


@router.get("/{contract_id}/seasonality")
def get_contract_seasonality(
    contract_id: int,
    years: int = 5,
    db: Session = Depends(get_db)
):
    """
    Get seasonality pattern for a contract.
    Returns data grouped by year and week for year-over-year comparison.
    """
    from datetime import datetime, timedelta
    
    # Get contract
    contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    # Calculate date range
    end_date = datetime.now()
    start_date = end_date - timedelta(days=365 * years)
    
    # Query reports grouped by year and week
    reports = db.query(
        extract('year', WeeklyReport.report_date).label('year'),
        extract('week', WeeklyReport.report_date).label('week_of_year'),
        WeeklyReport.dealer_net,
        WeeklyReport.asset_mgr_net,
        WeeklyReport.lev_net
    ).filter(
        WeeklyReport.contract_id == contract_id,
        WeeklyReport.report_date >= start_date,
        WeeklyReport.report_date <= end_date
    ).order_by('year', 'week_of_year').all()
    
    # Organize data by year
    years_data = {}
    for row in reports:
        year = int(row.year)
        week = int(row.week_of_year)
        
        if year not in years_data:
            years_data[year] = {}
        
        if week not in years_data[year]:
            years_data[year][week] = {
                'dealer_net': row.dealer_net,
                'asset_mgr_net': row.asset_mgr_net,
                'lev_net': row.lev_net
            }
    
    # Convert to format suitable for frontend (one entry per week with data for each year)
    weeks_data = {}
    for year, weeks in years_data.items():
        for week, values in weeks.items():
            if week not in weeks_data:
                weeks_data[week] = {'week': week}
            
            weeks_data[week][f'dealer_{year}'] = float(values['dealer_net']) if values['dealer_net'] else 0
            weeks_data[week][f'asset_mgr_{year}'] = float(values['asset_mgr_net']) if values['asset_mgr_net'] else 0
            weeks_data[week][f'lev_{year}'] = float(values['lev_net']) if values['lev_net'] else 0
    
    # Sort by week and convert to list
    seasonality_data = [weeks_data[week] for week in sorted(weeks_data.keys())]
    
    # Get list of years for frontend
    available_years = sorted(years_data.keys())
    
    return {
        "contract_id": contract_id,
        "contract_name": contract.contract_name,
        "years_analyzed": years,
        "available_years": available_years,
        "seasonality": seasonality_data
    }



@router.get("/{contract_id}/reports")
def get_contract_reports(
    contract_id: int,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """
    Get paginated list of ALL historical reports for a contract.
    """
    # Get contract
    contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    # Get total count
    total_count = db.query(func.count(WeeklyReport.id)).filter(
        WeeklyReport.contract_id == contract_id
    ).scalar()
    
    # Get paginated reports
    reports = db.query(WeeklyReport).filter(
        WeeklyReport.contract_id == contract_id
    ).order_by(WeeklyReport.report_date.desc()).limit(limit).offset(offset).all()
    
    return {
        "contract_id": contract_id,
        "contract_name": contract.contract_name,
        "total_count": total_count,
        "limit": limit,
        "offset": offset,
        "reports": [
            {
                "id": report.id,
                "report_date": report.report_date.isoformat(),
                "dealer_long": report.dealer_long,
                "dealer_short": report.dealer_short,
                "dealer_net": report.dealer_net,
                "asset_mgr_long": report.asset_mgr_long,
                "asset_mgr_short": report.asset_mgr_short,
                "asset_mgr_net": report.asset_mgr_net,
                "lev_long": report.lev_long,
                "lev_short": report.lev_short,
                "lev_net": report.lev_net,
                "open_interest": report.open_interest
            }
            for report in reports
        ]
    }


@router.get("/{contract_id}/historical-edge")
def get_historical_edge(
    contract_id: int,
    threshold: float = 20.0,
    forward_weeks: int = 4,
    lookback_years: int = 5,
    db: Session = Depends(get_db)
):
    """
    Get historical edge analysis for sentiment gap signals.
    Backtests performance when sentiment gap exceeds threshold.
    """
    from app.services.analysis.historical_edge import analyze_historical_edge
    
    contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    # Analyze for multiple thresholds
    results = []
    for thresh in [10.0, 20.0, 30.0]:
        analysis = analyze_historical_edge(
            db=db,
            contract_id=contract_id,
            threshold=thresh,
            forward_weeks=forward_weeks,
            lookback_years=lookback_years
        )
        results.append(analysis)
    
    return {
        "contract_id": contract_id,
        "contract_name": contract.contract_name,
        "analyses": results
    }
