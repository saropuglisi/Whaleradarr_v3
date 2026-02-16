import unittest
from unittest.mock import MagicMock, patch
from datetime import date
import sys
import os

# Fix path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../')))

from app.services.analyzer import AnalyzerService
from app.models.report import WeeklyReport
from app.models.price import WeeklyPrice
from app.models.statistics import ContractStatistics
from app.models.alert import WhaleAlert

class TestAnalyzerService(unittest.TestCase):
    def setUp(self):
        self.mock_db = MagicMock()
        self.service = AnalyzerService(self.mock_db)

    def test_generate_alerts_high_z_score(self):
        contract_id = 99
        report_date = date(2025, 2, 16)
        
        # 1. Mock Report (High Net Longs)
        mock_report = WeeklyReport(
            contract_id=contract_id,
            report_date=report_date,
            lev_net=200, # High Value
            lev_long=300,
            lev_short=100,
            is_rollover_week=False
        )
        
        # 2. Mock Price (Bullish: Close > VWAP)
        mock_price = WeeklyPrice(
            contract_id=contract_id,
            report_date=report_date,
            close_price=105,
            reporting_vwap=100, # Strength
            close_vs_vwap_pct=5.0
        )
        
        # 3. Mock Stats (Median=100, IQR=20)
        # Z = (200 - 100) / (20 * 0.7413) = 100 / 14.826 = 6.74 (Very High)
        mock_stats = ContractStatistics(
            contract_id=contract_id,
            rolling_median=100,
            rolling_iqr=20,
            all_time_max=300,
            all_time_min=0
        )
        
        # Setup DB Queries
        # query(WeeklyReport)
        self.mock_db.query.return_value.filter.return_value.order_by.return_value.first.return_value = mock_report
        
        # query(WeeklyPrice) -> chain is different: query().filter().first()
        # We need to distinguish calls. Since they are different models, return_value will be different if we mock side_effect or configure properly.
        # But simpler: we can check call args or just let it return the same chain mock if specific enough.
        
        # Let's use side_effect on query to return different mocks based on model
        def query_side_effect(model):
            query_mock = MagicMock()
            if model == WeeklyReport:
                query_mock.filter.return_value.order_by.return_value.first.return_value = mock_report
            elif model == WeeklyPrice:
                query_mock.filter.return_value.first.return_value = mock_price
            elif model == ContractStatistics:
                query_mock.filter.return_value.first.return_value = mock_stats
            elif model == WhaleAlert:
                query_mock.filter.return_value.delete.return_value = None
            return query_mock
            
        self.mock_db.query.side_effect = query_side_effect

        # Call
        self.service.generate_alerts(contract_id)
        
        # Assertions
        # Check if WhaleAlert was added
        args, _ = self.mock_db.add.call_args
        alert = args[0]
        
        self.assertIsInstance(alert, WhaleAlert)
        self.assertEqual(alert.alert_level, "High")
        self.assertGreater(alert.z_score, 2.0)
        self.assertEqual(alert.price_context, "Strength/Markup")
        self.assertTrue(alert.confidence_score > 50) # Base 50 + 30 (High Z)
        
        print("✅ TEST PASSED: Alert generation logic is correct.")

if __name__ == '__main__':
    unittest.main()
