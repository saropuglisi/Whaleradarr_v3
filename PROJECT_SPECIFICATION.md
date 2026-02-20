# WHALERADARR - PROJECT SPECIFICATION v2.5 (FINAL)
## Advanced Institutional Position Tracking Platform for Financial Futures

## 📋 TABLE OF CONTENTS
1. [Project Overview](#1-project-overview)
2. [Critical Issues & Solutions](#2-critical-issues--solutions)
3. [System Architecture](#3-system-architecture)
4. [Data Model (Complete DB Schema)](#4-data-model-complete-db-schema)
5. [Analysis Engine](#5-analysis-engine)
6. [API Specifications](#6-api-specifications)
7. [Implementation Roadmap](#7-implementation-roadmap)
8. [Technical Stack](#8-technical-stack)
9. [Deployment](#9-deployment)
10. [Known Issues & Limitations](#10-known-issues--limitations)
11. [Appendix: Formulas & Reference](#11-appendix-formulas--reference)

---

## 1. PROJECT OVERVIEW

### 1.1 Mission
WhaleRadarr analyzes the CFTC's Commitments of Traders (COT) reports to detect statistically significant changes in institutional positioning, providing alerts contextualized to price, statistically normalized, and cleaned of technical noise (rollover).

### 1.2 Core Value Proposition
- **Statistical Rigor:** Use of Robust Z-scores (Median/IQR) resistant to outliers.
- **Real Price Context:** Analysis of weekly VWAP to estimate if "whales" are accumulating in profit or absorbing losses.
- **Rollover Management:** Elimination of false positives via a deterministic expiration calendar.
- **Data Resilience:** Multi-provider strategy (Yahoo + Alpha Vantage fallback).
- **Dual Metrics:** Robust Z-score (short-term shock) + COT Index (long-term extremes).
- **Transparency:** Explicit confidence score and clear indication of data source.

### 1.3 What WhaleRadarr is NOT
- ❌ **Not Real-time:** CFTC data has a 3-day structural lag.
- ❌ **Not Predictive:** Shows what has happened, not what will happen.
- ❌ **Not Financial Advice:** Purely an educational/informational tool.
- ❌ **Not a Trading Signal:** Requires manual interpretation.

### 1.4 Data Lag Disclaimer
```text
┌─────────────────────────────────────────────────────────┐
│  CRITICAL: Data Timeline                                │
├─────────────────────────────────────────────────────────┤
│  Tuesday:   Position closing (CFTC snapshot)            │
│  Wednesday: CFTC receives data from brokers             │
│  Thursday:  Data validation                             │
│  Friday:    Report publication (~15:30 EST)             │
│                                                         │
│  → 3 DAYS OF LAG between positioning and publication    │
│  → The market has traded Wed, Thu, Fri in the meantime  │
└─────────────────────────────────────────────────────────┘
```

### 1.5 Data Source: TFF Report
**Report Used:** Traders in Financial Futures (TFF) - Futures-and-Options Combined.
- **Why TFF Combined:** It covers all financial markets (indices, currencies, treasuries, crypto) and includes options for a complete view of Open Interest.
- **Categories:** Dealer, Asset Manager, Leveraged Funds, Other.

---

## 2. CRITICAL ISSUES & SOLUTIONS

### 2.1 Issue #1: Futures Rollover (MAXIMUM CRITICALITY)
**The Problem:** During quarterly expirations, the shift of Open Interest between contracts generates massive false alarms (e.g., -90% on one expiration, +450% on the next).

**Solution A: Consolidated Contracts**
Use of "Consolidated" CFTC reports that aggregate all expiration months, eliminating 95% of the noise.

**Solution B: Hardcoded Expiration Calendar**
For non-consolidated contracts, implementing expiration rules via `pandas_market_calendars`.

```python
EXPIRY_RULES = {
    'stock_index': {'months': [3, 6, 9, 12], 'day_rule': 'third_friday'},
    'treasury': {'months': [3, 6, 9, 12], 'day_rule': 'last_business_day'},
    'currency': {'months': [3, 6, 9, 12], 'day_rule': 'third_wednesday'}
}

def is_rollover_week(contract: Contract, report_date: date) -> bool:
    """ Rollover window: 5-15 days before expiration """
    # Calculation logic based on calendar
    ...
```

### 2.2 Issue #2: Price Alignment & Cost Basis
**The Problem:** The "Tuesday Close" ignores weekly volatility. It's fundamental to understand if purchases occurred on strength or weakness.

**Solution: VWAP Window Reporting**
We calculate the VWAP from the previous report date (Wednesday) to the current one (Tuesday).
- **Close > VWAP:** Momentum / Strength.
- **Close < VWAP:** Absorption / Accumulation.

```python
def calculate_reporting_vwap(contract, current_date, prev_date):
    # Window: Wednesday -> Tuesday
    # VWAP = sum(Price * Volume) / sum(Volume)
    ...
```

### 2.3 Issue #3: Incorrect Percentage Calculation (CRITICAL BUG)
🚨 **The Denominator Paradox**
- **ERROR:** Using the current OI. If the OI collapses (rollover), the percentage impact is inflated.
- **CORRECT:** Always use the **PREVIOUS OI** as the denominator.

### 2.4 Issue #4: Non-Normal Distributions
**Solution: Robust Statistics (Median & IQR)**
We replace Mean and Standard Deviation with Median and Interquartile Range to calculate Z-Scores resistant to outliers.

```python
# Robust Z = (Value - Median) / (IQR * 0.7413)
```

### 2.5 Issue #5: Price Data Reliability
**Solution: Surgical Fallback Pattern**
1. **Primary:** Yahoo Finance (Batch).
2. **Validation:** Quality check (volumes, gaps, dates).
3. **Fallback:** Alpha Vantage (Surgical) for failed tickers.

### 2.6 Issue #6: Gross Exposure (Hedge Funds)
**The Problem:** Delta-neutral strategies hide risk increases if only Net is viewed.
**Solution:** Track **Gross Exposure (Long + Short)** to detect "volatility plays".

---

## 3. SYSTEM ARCHITECTURE

### 3.1 Complete Data Flow
```text
┌────────────────────────────────────────────────────────────────┐
│                       CFTC Website                             │
│  Download Friday 20:00 UTC (TFF Report)                        │
└───────────────────────┬────────────────────────────────────────┘
                        │ [1] DOWNLOAD & PARSE
                        ▼
┌────────────────────────────────────────────────────────────────┐
│  Parser Service: Normalization, Rollover, Gross Exposure     │
└───────────────────────┬────────────────────────────────────────┘
                        │ [2] PRICE & STATS
                        ▼
┌────────────────────────────────────────────────────────────────┐
│  Stats/Price Engine: Robust Z-Score, VWAP Window, Fallback     │
└───────────────────────┬────────────────────────────────────────┘
                        │ [3] ANALYSIS
                        ▼
┌────────────────────────────────────────────────────────────────┐
│  Analyzer Service: Alert Generation, Confidence Score          │
└───────────────────────┬────────────────────────────────────────┘
                        │ [4] DELIVERY
                        ▼
┌────────────────────────────────────────────────────────────────┐
│  API FastAPI -> Frontend React / Notifications (Telegram/Mail) │
└────────────────────────────────────────────────────────────────┘
```

---

## 4. DATA MODEL (COMPLETE DB SCHEMA)

```sql
-- CORE TABLES
CREATE TABLE contracts (
    id SERIAL PRIMARY KEY,
    cftc_contract_code VARCHAR(20) UNIQUE NOT NULL,
    contract_name VARCHAR(255) NOT NULL,
    market_category VARCHAR(50) NOT NULL,
    yahoo_ticker VARCHAR(20),
    alpha_vantage_ticker VARCHAR(20),
    expiry_rule VARCHAR(50),
    expiry_months INTEGER[],
    is_consolidated BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE weekly_reports (
    id SERIAL PRIMARY KEY,
    contract_id INTEGER REFERENCES contracts(id),
    report_date DATE NOT NULL,
    dealer_long BIGINT, dealer_short BIGINT,
    asset_mgr_long BIGINT, asset_mgr_short BIGINT,
    lev_money_long BIGINT, lev_money_short BIGINT,
    lev_money_gross_total BIGINT GENERATED ALWAYS AS (lev_money_long + lev_money_short) STORED,
    open_interest BIGINT NOT NULL,
    is_rollover_week BOOLEAN DEFAULT false,
    UNIQUE(contract_id, report_date)
);

CREATE TABLE weekly_prices (
    id SERIAL PRIMARY KEY,
    contract_id INTEGER REFERENCES contracts(id),
    report_date DATE NOT NULL,
    close_price DECIMAL(12, 4),
    reporting_vwap DECIMAL(12, 4),
    close_vs_vwap_pct DECIMAL(10, 2),
    data_source VARCHAR(20),
    UNIQUE(contract_id, report_date)
);

CREATE TABLE contract_statistics (
    id SERIAL PRIMARY KEY,
    contract_id INTEGER REFERENCES contracts(id),
    trader_category VARCHAR(20),
    position_type VARCHAR(10),
    rolling_median DECIMAL(15, 2),
    rolling_iqr DECIMAL(15, 2),
    all_time_min DECIMAL(15, 2),
    all_time_max DECIMAL(15, 2),
    UNIQUE(contract_id, trader_category, position_type)
);

CREATE TABLE whale_alerts (
    id SERIAL PRIMARY KEY,
    contract_id INTEGER REFERENCES contracts(id),
    report_date DATE NOT NULL,
    alert_level VARCHAR(20),
    z_score DECIMAL(10, 4),
    cot_index DECIMAL(5, 2),
    price_context VARCHAR(50),
    confidence_score DECIMAL(5, 2),
    is_rollover_week BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 5. ANALYSIS ENGINE

### 5.1 Complete Analyzer (v2.5)
```python
def analyze_position(current, previous, stats, price_data, is_rollover):
    # 1. Delta with correct denominator (Previous OI)
    delta_oi_pct = abs(current.val - previous.val) / previous.open_interest * 100
    
    # 2. Robust Z-Score
    z_score = (current.val - stats.median) / (stats.iqr * 0.7413) if stats.iqr > 0 else 0
    
    # 3. COT Index (0-100)
    cot_index = (current.val - stats.min) / (stats.max - stats.min) * 100
    
    # 4. Price Context (VWAP)
    in_profit = price_data.close > price_data.reporting_vwap
    context = classify_context(current.delta, in_profit)
    
    # 5. Alert Level
    level = determine_level(z_score, cot_index, delta_oi_pct)
    
    # 6. Confidence Score
    confidence = calculate_confidence(z_score, cot_index, is_rollover, context)
    
    return Alert(level, z_score, cot_index, context, confidence)
```

---

## 6. API SPECIFICATIONS
- **GET /api/v1/alerts:** Advanced filters for confidence, rollover, and category.
- **GET /api/v1/contracts/{id}/analysis:** Institutional positions charts vs Price/VWAP.
- **GET /api/v1/analysis/extremes:** Identification of assets in hyper-positioning conditions.

---

## 7. IMPLEMENTATION ROADMAP
- **Phase 1: Core (Weeks 1-4):** CFTC ingestion, TFF Parser, Name aliasing, Rollover.
- **Phase 2: Stats & Price (Weeks 5-8):** Resilient Fetcher, VWAP Window, Robust Stats.
- **Phase 3: Analysis (Weeks 9-12):** WhaleAnalyzer, Confidence Scoring, Gross Exposure.
- **Phase 4: API & UX (Weeks 13-16):** FastAPI, Auth, Watchlist.
- **Phase 5: Frontend (Weeks 17-20):** React Dashboard, Recharts Positioning.
- **Phase 6: Ops (Weeks 21-24):** Notifications (Telegram/Mail), Prometheus, Deploy.

---

## 8. TECHNICAL STACK
- **Backend:** Python 3.11, FastAPI, SQLAlchemy 2.0, PostgreSQL 14, Redis.
- **Data Analysis:** Pandas, NumPy, SciPy, pandas_market_calendars.
- **Finance:** yfinance, alpha_vantage.
- **Frontend:** React 18, Vite, Recharts, Tailwind CSS.

---

## 9. DEPLOYMENT
```yaml
services:
  backend:
    build: ./backend
    depends_on: [postgres, redis]
    environment: [DATABASE_URL, SECRET_KEY]
  postgres:
    image: postgres:14-alpine
  redis:
    image: redis:7-alpine
```

---

## 10. KNOWN ISSUES & LIMITATIONS
1. **Time Lag (3 Days):** CFTC delay is structural (Tuesday -> Friday).
2. **VWAP Estimation:** Calculated on Daily data, it is an approximation of the real intraday VWAP.
3. **Contract Multipliers Gaps:** Differences between Standard and Micro can distort absolute monetary value analysis.
4. **Historical Name Drifting:** Contract names in CFTC historical files may vary, requiring maintenance of aliases.
5. **Non-Reportable Bias:** "Retail" sentiment is aggregated and includes operators of various types.

---

## 11. APPENDIX: FORMULAS & REFERENCE

### Robust Z-Score
$$Robust\ Z = \frac{Value - Median}{IQR \times 0.7413}$$

### Weekly VWAP (Reporting Window)
$$VWAP = \frac{\sum_{i=Wed}^{Tue} (TypicalPrice_i \times Volume_i)}{\sum_{i=Wed}^{Tue} Volume_i}$$

---
**Version:** 2.5 (FINAL)  
**Last Updated:** February 11, 2026  
**Status:** Ready for Implementation
