from typing import List, Dict, Any, Optional
import numpy as np
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from app.models.contract import Contract
from app.models.contract import Contract
from app.models.report import WeeklyReport
from app.services.analysis.cot_staleness import COTStalenessService
from app.services.analysis.insight_generator import InsightGenerator
# from app.services.analysis.historical_edge import HistoricalEdgeService

class SmartRadarService:
    def __init__(self, db: Session):
        self.db = db
        self.staleness_service = COTStalenessService(db)
        # self.edge_service = HistoricalEdgeService(db)

    def get_radar_rankings(self) -> Dict[str, Any]:
        """
        Rank all active contracts by Institutional Conviction Score.
        """
        contracts = self.db.query(Contract).filter(Contract.is_active == True).all()
        rankings = []
        
        sectors = {}

        for contract in contracts:
            # 1. Fetch Data (Fetch 3 for momentum calculation)
            reports = self.db.query(WeeklyReport).filter(
                WeeklyReport.contract_id == contract.id
            ).order_by(WeeklyReport.report_date.desc()).limit(3).all()

            if not reports:
                continue

            latest_report = reports[0]
            prev_report = reports[1] if len(reports) > 1 else latest_report
            prev_prev_report = reports[2] if len(reports) > 2 else prev_report

            # Calculate Current Score
            current_score_data = self._calculate_conviction(contract, latest_report, prev_report, is_current=True)
            current_score = current_score_data['score']
            
            # Calculate Previous Score (for momentum)
            # Assumption: For past score, we assume "Confidence" was High (1.0) as it was fresh then.
            prev_score_data = self._calculate_conviction(contract, prev_report, prev_prev_report, is_current=False)
            prev_score = prev_score_data['score']
            
            momentum_1w = round(current_score - prev_score, 1)

            # Contract Data
            contract_data = {
                "id": contract.id,
                "ticker": contract.cftc_contract_code,
                "name": contract.contract_name,
                "category": contract.market_category,
                "score": current_score,
                "grade": self.get_conviction_grade(current_score),
                "direction": current_score_data['direction'],
                "confidence": current_score_data['confidence'],
                "sentiment_gap": current_score_data['sentiment_gap'],
                "capital_flow_fmt": self.format_capital_flow(current_score_data['am_net_change']),
                "net_change": current_score_data['am_net_change'],
                "win_rate": current_score_data['win_rate'],
                "momentum_1w": momentum_1w,
                "last_updated": datetime.utcnow().isoformat(),
                "next_report_date": (latest_report.report_date + timedelta(days=7)).isoformat(), # Approx
                "breakdown": current_score_data['breakdown']
            }
            
            rankings.append(contract_data)
            
            # Sector Aggregation
            if contract.market_category not in sectors:
                sectors[contract.market_category] = {"scores": [], "count": 0}
            sectors[contract.market_category]["scores"].append(current_score)
            sectors[contract.market_category]["count"] += 1

        # Sort by Score
        rankings.sort(key=lambda x: x['score'], reverse=True)
        
        # Sector Summary
        sector_summary = {}
        for sector, data in sectors.items():
            avg_score = sum(data["scores"]) / len(data["scores"])
            sector_summary[sector] = round(avg_score, 1)

        # Insights Generation (Dynamic Rule-Based)
        insight_gen = InsightGenerator()
        insights = insight_gen.generate_ai_insight(
            top_contract=rankings[0] if rankings else {},
            all_contracts=rankings
        )

        return {
            "top_play": rankings[0] if rankings else None,
            "rankings": rankings,
            "sector_summary": sector_summary,
            "insights": insights
        }

    def _calculate_conviction(self, contract, report, prev_report, is_current=True):
        # 1. Staleness & Confidence
        if is_current:
            staleness_data = self.staleness_service.calculate_score(contract.id)
            if "error" in staleness_data:
                confidence = 0.5
            else:
                confidence = staleness_data['reliability_pct'] / 100.0
        else:
            confidence = 1.0 # Assume fresh for historical calculation

        # 2. Sentiment Gap
        am_long = report.asset_mgr_long
        am_short = report.asset_mgr_short
        am_total = am_long + am_short + 1 
        am_net = am_long - am_short
        
        retail_long = report.non_report_long
        retail_short = report.non_report_short
        retail_total = retail_long + retail_short + 1
        
        am_long_pct = (am_long / am_total) * 100
        retail_long_pct = (retail_long / retail_total) * 100
        
        sentiment_gap = am_long_pct - retail_long_pct
        
        # 3. Capital Flow Momentum
        am_net_prev = prev_report.asset_mgr_long - prev_report.asset_mgr_short
        net_change = am_net - am_net_prev
        position_change_pct = net_change / (abs(am_net_prev) + 1)
        
        # 4. Historical Edge (Heuristic)
        est_win_rate = 0.50 + (min(abs(sentiment_gap), 60) / 60) * 0.25 
        
        # 5. Concentration
        exposure_ratio = (am_long + am_short) / (report.open_interest + 1)

        # Score Components
        signal_quality = confidence * confidence
        sentiment_divergence = min(abs(sentiment_gap) / 40.0, 1.0)
        capital_momentum = np.clip(abs(position_change_pct) / 0.20, 0, 1.0)
        historical_edge = max((est_win_rate - 0.50) / 0.20, 0)
        concentration = min(exposure_ratio / 0.15, 1.0)
        
        conviction = (
            0.25 * signal_quality +
            0.20 * sentiment_divergence +
            0.20 * capital_momentum +
            0.20 * historical_edge +
            0.15 * concentration
        )
        
        score = round(conviction * 100, 1)

        direction = "BULLISH" if sentiment_gap > 0 else "BEARISH"
        if abs(sentiment_gap) < 5:
            direction = "NEUTRAL"

        return {
            "score": score,
            "direction": direction,
            "confidence": round(confidence * 100),
            "sentiment_gap": round(sentiment_gap, 1),
            "am_net_change": net_change,
            "win_rate": round(est_win_rate * 100),
            "breakdown": {
                "signal_quality": round(signal_quality * 100, 1),
                "sentiment_divergence": round(sentiment_divergence * 100, 1),
                "capital_momentum": round(capital_momentum * 100, 1),
                "historical_edge": round(historical_edge * 100, 1),
                "concentration": round(concentration * 100, 1)
            }
        }

    def get_conviction_grade(self, score_pct):
        if score_pct >= 80: return "🔥 EXTREME CONVICTION"
        if score_pct >= 65: return "💎 HIGH CONVICTION"
        if score_pct >= 50: return "✅ MODERATE CONVICTION"
        if score_pct >= 35: return "⚠️ WEAK CONVICTION"
        return "❌ NO CONVICTION"

    def format_capital_flow(self, net_change):
        sign = "+" if net_change >= 0 else "-"
        return f"{sign}{abs(net_change):,}"

    def generate_structured_insights(self, rankings, sector_summary):
        # AI Logic Mockup - In prod this would use an LLM or complex rules
        
        # 1. Detect Regime (Top Sector)
        regime = "Neutral / Mixed"
        confidence = 50
        action = "Wait and See"
        
        if sector_summary:
            top_sector = max(sector_summary.items(), key=lambda x: x[1])
            if top_sector[1] > 70:
                regime = f"Risk-On {top_sector[0]} Rotation" if top_sector[0] in ['index', 'crypto'] else f"Defensive {top_sector[0]} Rotation"
                confidence = int(min(top_sector[1] + 15, 95))
        
        # 2. Catalyst logic (Mock)
        catalysts = [
            "Fed Chair Powell Speech (Feb 21)",
            "China PMI Data (Feb 28)",
            "Month-End Rebalancing Flows"
        ]

        # 3. Construct Insight Object
        return {
            "regime": regime,
            "confidence": confidence,
            "what_happening": f"Institutional capital is aggressively rotating into {top_sector[0] if sector_summary else 'cash'} assets. Asset managers have increased net long positions significantly over the last 2 weeks.",
            "historical_outcome": f"When {top_sector[0] if sector_summary else 'Sector'} conviction exceeds 70, the sector typically outperforms the broad market by 4.2% over the next 4 weeks (75% Win Rate).",
            "catalysts": catalysts,
            "action": f"Consider overlaying long exposure to top-ranked {top_sector[0] if sector_summary else ''} assets. Watch for conviction scores dropping below 65 as an early exit signal."
        }
