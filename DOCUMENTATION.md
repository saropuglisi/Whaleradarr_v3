# WhaleRadarr - Technical Documentation

This document provides a detailed description of the architecture, data models, and processes implemented in WhaleRadarr.

## 1. Data Model

The PostgreSQL database is the heart of the platform and stores all data related to contracts, reports, prices, and analysis. The schema is designed to ensure consistency, performance, and data integrity.

```sql
-- Table of analyzed futures contracts
CREATE TABLE contracts (
    id SERIAL PRIMARY KEY,
    cftc_contract_code VARCHAR(20) UNIQUE NOT NULL, -- Unique contract code for the CFTC
    contract_name VARCHAR(255) NOT NULL,            -- Human-readable contract name (e.g., "S&P 500 E-MINI")
    market_category VARCHAR(50) NOT NULL,           -- Market category (e.g., "Equity Indices", "Currencies")
    yahoo_ticker VARCHAR(20),                       -- Ticker for Yahoo Finance
    alpha_vantage_ticker VARCHAR(20),               -- Ticker for Alpha Vantage (fallback)
    expiry_rule VARCHAR(50),                        -- Rule for calculating expiration (e.g., "third_friday")
    expiry_months INTEGER[],                        -- Expiration months (e.g., [3, 6, 9, 12])
    is_consolidated BOOLEAN DEFAULT false,          -- If the CFTC report is already consolidated
    is_active BOOLEAN DEFAULT true,                 -- If the contract is currently monitored
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table of weekly CFTC reports
CREATE TABLE weekly_reports (
    id SERIAL PRIMARY KEY,
    contract_id INTEGER REFERENCES contracts(id),
    report_date DATE NOT NULL,                      -- Report date (always a Tuesday)
    dealer_long BIGINT,                             -- Dealer Long positions
    dealer_short BIGINT,                            -- Dealer Short positions
    asset_mgr_long BIGINT,                          -- Asset Manager Long positions
    asset_mgr_short BIGINT,                         -- Asset Manager Short positions
    lev_money_long BIGINT,                          -- Leveraged Money (Hedge Fund) Long positions
    lev_money_short BIGINT,                         -- Leveraged Money Short positions
    lev_money_gross_total BIGINT GENERATED ALWAYS AS (lev_money_long + lev_money_short) STORED, -- Gross exposure
    open_interest BIGINT NOT NULL,                  -- Total Open Interest for that contract
    is_rollover_week BOOLEAN DEFAULT false,         -- Flag indicating if it's a rollover week
    UNIQUE(contract_id, report_date)
);

-- Table of weekly price data
CREATE TABLE weekly_prices (
    id SERIAL PRIMARY KEY,
    contract_id INTEGER REFERENCES contracts(id),
    report_date DATE NOT NULL,                      -- Report date the price is associated with
    close_price DECIMAL(12, 4),                     -- Tuesday closing price
    reporting_vwap DECIMAL(12, 4),                  -- VWAP calculated in the report time window (Wed-Tue)
    close_vs_vwap_pct DECIMAL(10, 2),               -- % change between close and VWAP
    data_source VARCHAR(20),                        -- Data source (e.g., "Yahoo Finance", "Alpha Vantage")
    UNIQUE(contract_id, report_date)
);

-- Table for rolling statistics (median, IQR, min, max)
CREATE TABLE contract_statistics (
    id SERIAL PRIMARY KEY,
    contract_id INTEGER REFERENCES contracts(id),
    trader_category VARCHAR(20),                    -- Operator category (e.g., "asset_mgr", "lev_money")
    position_type VARCHAR(10),                      -- Position type (e.g., "long", "short", "net")
    rolling_median DECIMAL(15, 2),                  -- Rolling median (e.g., 26 weeks)
    rolling_iqr DECIMAL(15, 2),                     -- Rolling Interquartile Range
    all_time_min DECIMAL(15, 2),                    -- All-time low
    all_time_max DECIMAL(15, 2),                    -- All-time high
    UNIQUE(contract_id, trader_category, position_type)
);

-- Table for generated alerts
CREATE TABLE whale_alerts (
    id SERIAL PRIMARY KEY,
    contract_id INTEGER REFERENCES contracts(id),
    report_date DATE NOT NULL,
    alert_level VARCHAR(20),                        -- Alert level (e.g., "High", "Medium", "Low")
    z_score DECIMAL(10, 4),                         -- Calculated Robust Z-score
    cot_index DECIMAL(5, 2),                        -- COT Index (0-100)
    price_context VARCHAR(50),                      -- Price context (e.g., "Accumulation", "Momentum")
    confidence_score DECIMAL(5, 2),                 -- Alert reliability score
    is_rollover_week BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 2. Data Ingestion Process

The ingestion process is orchestrated by a series of Python scripts and services that handle data retrieval, cleaning, and storage.

### 2.1 `cot_loader.py` - CFTC Report Loading

-   **Purpose**: Automate the download and parsing of "Traders in Financial Futures" reports from the CFTC website.
-   **Trigger**: Executed every Friday evening, after the publication of data by the CFTC.
-   **Operation**:
    1.  Downloads the ZIP file containing the reports.
    2.  Extracts the text file (`fut_fin_xls.txt`).
    3.  Reads the file, ignoring header and footer lines.
    4.  For each line, parses the fields of interest, mapping CFTC contract names to the system's internal names.
    5.  Populates the `weekly_reports` table with normalized data.

### 2.2 `price_loader.py` - Price Data Loading

-   **Purpose**: Enrich weekly reports with price and volume data.
-   **Trigger**: Executed after `cot_loader.py`.
-   **Operation**:
    1.  For each new report in `weekly_reports`, identifies the `contract_id` and `report_date`.
    2.  Uses the ticker associated with the contract (first `yahoo_ticker`) to query the **Yahoo Finance** API.
    3.  Retrieves daily Price (OHLC) and Volume data for the time window of interest (from Wednesday to Tuesday).
    4.  **In case of failure** (e.g., ticker not found, incomplete data), attempts a fallback using `alpha_vantage_ticker` and the **Alpha Vantage** API.
    5.  Calculates the **VWAP** for the reporting window.
    6.  Stores the results (closing price, VWAP, data source) in the `weekly_prices` table.

## 3. API (In Development)

RESTful APIs will be developed using **FastAPI** to expose data and analysis to the frontend. Preliminary specifications follow.

### GET `/api/v1/alerts`

-   **Description**: Returns a list of `Whale Alerts`, with advanced filtering options.
-   **Query Parameters**:
    -   `min_confidence` (float): Filter by minimum confidence score.
    -   `contract_category` (str): Filter by market category (e.g., "currency").
    -   `start_date` / `end_date` (date): Filter by date range.
    -   `include_rollover` (bool): Include or exclude alerts that occurred during rollover weeks.
-   **Response**: Array of `WhaleAlert` objects.

### GET `/api/v1/contracts/{contract_id}/analysis`

-   **Description**: Provides complete data for a single contract, useful for chart visualization.
-   **Response**: An object containing:
    -   Contract details.
    -   Historical series of net positions for each operator category.
    -   Historical series of closing prices and VWAP.
    -   List of historical alerts for that contract.

### GET `/api/v1/analysis/extremes`

-   **Description**: Identifies markets currently in extreme positioning conditions, based on the **COT Index**.
-   **Query Parameters**:
    -   `category` (str): "asset_mgr" or "lev_money".
    -   `position` (str): "long" or "short".
    -   `threshold` (int): Threshold for the COT Index (e.g., > 90 or < 10).
-   **Response**: List of contracts satisfying the criteria, ordered by proximity to the extreme.
