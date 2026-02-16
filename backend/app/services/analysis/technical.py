import pandas as pd
import pandas_ta as ta
from sqlalchemy.orm import Session
from app.models.daily_price import DailyPrice
from loguru import logger
from datetime import datetime, timedelta

class TechnicalAnalyzer:
    """
    Service for calculating technical indicators using pandas-ta.
    """
    def __init__(self, db: Session):
        self.db = db
    
    def get_daily_prices(self, contract_id: int, days_back: int = 365) -> pd.DataFrame:
        """
        Fetch daily prices for a contract and return as DataFrame.
        """
        start_date = datetime.now().date() - timedelta(days=days_back)
        
        prices = self.db.query(DailyPrice).filter(
            DailyPrice.contract_id == contract_id,
            DailyPrice.date >= start_date
        ).order_by(DailyPrice.date).all()
        
        if not prices:
            logger.warning(f"No daily prices found for contract {contract_id}")
            return pd.DataFrame()
        
        df = pd.DataFrame([{
            'date': p.date,
            'open': float(p.open_price),
            'high': float(p.high_price),
            'low': float(p.low_price),
            'close': float(p.close_price),
            'volume': int(p.volume)
        } for p in prices])
        
        df.set_index('date', inplace=True)
        return df
    
    def calculate_rsi(self, df: pd.DataFrame, period: int = 14) -> float:
        """
        Calculate the current RSI (Relative Strength Index).
        Returns the most recent RSI value.
        """
        if df.empty or len(df) < period + 1:
            return None
        
        rsi = ta.rsi(df['close'], length=period)
        return float(rsi.iloc[-1]) if not pd.isna(rsi.iloc[-1]) else None
    
    def calculate_ema(self, df: pd.DataFrame, period: int = 50) -> float:
        """
        Calculate the Exponential Moving Average.
        Returns the most recent EMA value.
        """
        if df.empty or len(df) < period:
            return None
        
        ema = ta.ema(df['close'], length=period)
        return float(ema.iloc[-1]) if not pd.isna(ema.iloc[-1]) else None
    
    def get_trend_direction(self, df: pd.DataFrame) -> str:
        """
        Determine trend direction based on EMA crossovers.
        Returns: 'bullish', 'bearish', or 'neutral'
        """
        if df.empty or len(df) < 200:
            return 'neutral'
        
        ema_50 = self.calculate_ema(df, 50)
        ema_200 = self.calculate_ema(df, 200)
        current_price = float(df['close'].iloc[-1])
        
        if ema_50 is None or ema_200 is None:
            return 'neutral'
        
        # Price above both EMAs = strong bullish
        if current_price > ema_50 > ema_200:
            return 'bullish'
        # Price below both EMAs = strong bearish
        elif current_price < ema_50 < ema_200:
            return 'bearish'
        else:
            return 'neutral'
    
    def generate_timing_signal(self, contract_id: int) -> dict:
        """
        Generate comprehensive timing signal for a contract.
        Returns a dict with RSI, trend, and actionable signal.
        """
        df = self.get_daily_prices(contract_id, days_back=365)
        
        if df.empty:
            return {
                'rsi': None,
                'trend': 'unknown',
                'signal': 'No Data',
                'ema_50': None,
                'ema_200': None
            }
        
        rsi = self.calculate_rsi(df)
        ema_50 = self.calculate_ema(df, 50)
        ema_200 = self.calculate_ema(df, 200)
        trend = self.get_trend_direction(df)
        
        # Determine actionable signal
        signal = "Wait"
        if rsi is not None:
            if rsi < 30 and trend == 'bullish':
                signal = "Entry Zone (Oversold)"
            elif rsi > 70 and trend == 'bearish':
                signal = "Exit Zone (Overbought)"
            elif 40 <= rsi <= 60:
                signal = "Neutral Zone"
        
        return {
            'rsi': round(rsi, 2) if rsi else None,
            'trend': trend,
            'signal': signal,
            'ema_50': round(ema_50, 2) if ema_50 else None,
            'ema_200': round(ema_200, 2) if ema_200 else None
        }
