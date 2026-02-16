"""
Historical Edge Analysis Service
Backtests sentiment gap signals and calculates forward returns
"""
from typing import List, Dict, Optional
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models.report import WeeklyReport
from app.models.price import WeeklyPrice


def calculate_sentiment_gap(report: WeeklyReport) -> float:
    """Calculate sentiment gap between whales and retail"""
    whale_net = report.asset_mgr_net or 0
    retail_net = (report.non_report_long or 0) - (report.non_report_short or 0)
    
    whale_total = abs(report.asset_mgr_long or 0) + abs(report.asset_mgr_short or 0)
    retail_total = abs(report.non_report_long or 0) + abs(report.non_report_short or 0)
    
    if whale_total == 0 or retail_total == 0:
        return 0.0
    
    whale_pct = (whale_net / whale_total) * 100
    retail_pct = (retail_net / retail_total) * 100
    
    return whale_pct - retail_pct


def analyze_historical_edge(
    db: Session,
    contract_id: int,
    threshold: float = 20.0,
    forward_weeks: int = 4,
    lookback_years: int = 5
) -> Dict:
    """
    Analyze historical performance when sentiment gap exceeds threshold
    
    Args:
        db: Database session
        contract_id: Contract ID
        threshold: Sentiment gap threshold (%)
        forward_weeks: Weeks to measure forward return
        lookback_years: Years of historical data to analyze
        
    Returns:
        Dictionary with backtest statistics
    """
    # Calculate cutoff date
    cutoff_date = datetime.now() - timedelta(days=365 * lookback_years)
    
    # Fetch historical reports
    reports = db.query(WeeklyReport).filter(
        WeeklyReport.contract_id == contract_id,
        WeeklyReport.report_date >= cutoff_date
    ).order_by(WeeklyReport.report_date).all()
    
    if not reports:
        return {
            "threshold": threshold,
            "sample_size": 0,
            "win_rate": 0.0,
            "avg_return": 0.0,
            "max_return": 0.0,
            "min_return": 0.0,
            "occurrences": []
        }
    
    # Fetch all prices for this period
    prices = db.query(WeeklyPrice).filter(
        WeeklyPrice.contract_id == contract_id,
        WeeklyPrice.report_date >= cutoff_date
    ).order_by(WeeklyPrice.report_date).all()
    
    # Create price lookup by date
    price_map = {p.report_date: p.close_price for p in prices}
    
    # Analyze each signal
    signals = []
    for i, report in enumerate(reports):
        gap = calculate_sentiment_gap(report)
        
        # Check if signal triggered (absolute value for both long and short divergences)
        if abs(gap) >= threshold:
            entry_date = report.report_date
            entry_price = price_map.get(entry_date)
            
            if not entry_price:
                continue
            
            # Find exit date (forward_weeks later)
            exit_date = entry_date + timedelta(weeks=forward_weeks)
            
            # Find closest exit price
            exit_price = None
            for days_offset in range(0, 14):  # Look within 2 weeks around target date
                check_date = exit_date + timedelta(days=days_offset)
                if check_date in price_map:
                    exit_price = price_map[check_date]
                    break
            
            if exit_price:
                # Calculate return
                pct_return = ((exit_price - entry_price) / entry_price) * 100
                
                # Direction of signal (positive gap = whales long, negative = whales short)
                signal_direction = "long" if gap > 0 else "short"
                
                # For short signals, invert the return
                if signal_direction == "short":
                    pct_return = -pct_return
                
                signals.append({
                    "date": entry_date.isoformat(),
                    "gap": round(gap, 2),
                    "direction": signal_direction,
                    "entry_price": round(entry_price, 2),
                    "exit_price": round(exit_price, 2),
                    "return_pct": round(pct_return, 2),
                    "win": pct_return > 0
                })
    
    if not signals:
        return {
            "threshold": threshold,
            "sample_size": 0,
            "win_rate": 0.0,
            "avg_return": 0.0,
            "max_return": 0.0,
            "min_return": 0.0,
            "occurrences": []
        }
    
    # Calculate statistics
    returns = [s["return_pct"] for s in signals]
    wins = [s for s in signals if s["win"]]
    
    return {
        "threshold": threshold,
        "forward_weeks": forward_weeks,
        "lookback_years": lookback_years,
        "sample_size": len(signals),
        "win_rate": round((len(wins) / len(signals)) * 100, 1),
        "avg_return": round(sum(returns) / len(returns), 2),
        "max_return": round(max(returns), 2),
        "min_return": round(min(returns), 2),
        "median_return": round(sorted(returns)[len(returns) // 2], 2),
        "win_avg": round(sum([s["return_pct"] for s in wins]) / len(wins), 2) if wins else 0.0,
        "loss_avg": round(sum([s["return_pct"] for s in signals if not s["win"]]) / len([s for s in signals if not s["win"]]), 2) if len([s for s in signals if not s["win"]]) > 0 else 0.0,
        "occurrences": signals[-10:]  # Return last 10 for reference
    }
