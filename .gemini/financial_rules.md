# FINANCIAL LOGIC & MATHEMATICAL RULES (STRICT)

## 1. ROBUST STATISTICS (NON-NORMAL DISTRIBUTION)
Financial data has fat tails. Standard Mean/StdDev are forbidden.
- **Metric:** Robust Z-Score.
- **Formula:** `Z = (Current_Value - Rolling_Median_52w) / (Rolling_IQR_52w * 0.7413)`
- **Constant:** `0.7413` normalizes IQR to approximate StdDev for comparability.
- **Thresholds:** - CRITICAL: |Z| > 3.0
  - SIGNIFICANT: |Z| > 2.0

## 2. COT INDEX (LONG-TERM EXTREMES)
- **Formula:** `Index = (Current - Min_AllTime) / (Max_AllTime - Min_AllTime) * 100`
- **Signals:** > 95 (Extreme Long), < 5 (Extreme Short).

## 3. OPEN INTEREST IMPACT (THE DENOMINATOR RULE)
- **Rule:** When calculating the % change of a position relative to Open Interest (OI), use the **PREVIOUS WEEK'S OI** as the denominator.
- **Reason:** Prevents percentage inflation if Current OI collapses (e.g., during rollover).
- **Formula:** `Impact_% = (Delta_Position / Previous_OI) * 100`

## 4. PRICE CONTEXT (VWAP WINDOW)
- **Window:** From Wednesday (post-previous report) to Tuesday (current report).
- **Typical Price:** `(High + Low + Close) / 3`
- **Interpretation:**
  - `Close > VWAP` + `Buying`: Momentum (Profitable Entry).
  - `Close < VWAP` + `Buying`: Absorption (Bag Holding/Accumulation).

## 5. ROLLOVER DETECTION
- **Method:** Hardcoded calendar (e.g., 3rd Friday of Mar/Jun/Sep/Dec) via `pandas_market_calendars`.
- **Window:** 15 days prior to expiration.
- **Action:** If inside window, set flag `is_rollover_week = True` and penalize Confidence Score by 30 points.

## 6. LEVERAGED FUNDS GROSS EXPOSURE
- **Logic:** Hedge funds use delta-neutral strategies. Net position hides risk.
- **Metric:** `Gross_Exposure = Long_Positions + Short_Positions`.
- **Alert:** Trigger if Net Change is flat (<5%) BUT Gross Exposure increases significantly (>15%).