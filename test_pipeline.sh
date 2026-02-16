#!/bin/bash
# Whaleradarr Full Pipeline Test Script

echo "=== WHALERADARR v3 - FULL PIPELINE TEST ==="

# Set Local Testing Defaults (Override if needed)
export POSTGRES_HOST="127.0.0.1"
export POSTGRES_PORT="5433"
export POSTGRES_USER="user"
export POSTGRES_PASSWORD="password"
export POSTGRES_DB="whaleradarr"

echo "✅ Environment Configured: HOST=$POSTGRES_HOST, PORT=$POSTGRES_PORT"

# 1. Initialize DB & Seed Contracts & Historical Data
echo "\n[1/3] Running Historical Setup (DB Init + COT Data)..."
.venv/bin/python backend/scripts/setup_historical.py

if [ $? -ne 0 ]; then
    echo "❌ Historical Setup Failed!"
    exit 1
fi

# 2. Ingest Prices
echo "\n[2/3] Ingesting Price Data (Yahoo Finance)..."
.venv/bin/python backend/scripts/setup_prices.py

if [ $? -ne 0 ]; then
    echo "❌ Price Ingestion Failed!"
    exit 1
fi

# 3. Run Analysis Engine
echo "\n[3/3] Running Analysis Engine (Stats & Alerts)..."
.venv/bin/python backend/scripts/run_analysis_pipeline.py

if [ $? -ne 0 ]; then
    echo "❌ Analysis Failed!"
    exit 1
fi

echo "\n✅ PIPELINE COMPLETED SUCCESSFULLY!"
echo "Check the database 'whale_alerts' table for results."
