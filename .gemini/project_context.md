# WHALERADARR v2.5 - SYSTEM CONTEXT

## MISSION
WhaleRadarr is an advanced quantitative intelligence platform tracking institutional positioning in financial futures via CFTC COT reports. It distinguishes itself through **Robust Statistics** (outlier-resistant) and **Price Context** (VWAP).

## DATA TIMELINE CONSTRAINT (CRITICAL)
- **T (Tuesday):** Market positions recorded (The Snapshot).
- **T+3 (Friday):** Report published by CFTC.
- **Implication:** The system analyzes events that happened 3 days ago. 
- **Rule:** Never treat CFTC data as "Real-time". Always align price data to the Tuesday snapshot, not the Friday publication date.

## CORE ARCHITECTURE (ETL)
1.  **Ingestion:** Download annual ZIPs from CFTC (Friday 20:00 UTC).
2.  **Parsing:** Extract TFF Combined report data. Normalize contract names via `contract_aliases`.
3.  **Enrichment:** - Fetch OHLCV price data via Yahoo Finance (Primary) or Alpha Vantage (Fallback).
    - Calculate Weekly VWAP (Wednesday to Tuesday window).
4.  **Analysis:** - Calculate Rolling 52-week Robust Statistics (Median, IQR).
    - Detect Whale Alerts using Dual Metrics (Z-Score + COT Index).
5.  **Distribution:** Push alerts via API/Webhooks.

## KEY ENTITIES
- **Whales:** 'Asset Manager/Institutional' and 'Leveraged Funds'.
- **Retail Proxy:** 'Non-Reportable Positions'.
- **Rollover:** Quarterly expiration events that must be filtered out.