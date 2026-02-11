# WHALERADARR - PROJECT SPECIFICATION v2.5 (FINAL)
## Piattaforma Avanzata di Tracciamento Posizioni Istituzionali per Futures Finanziari

## 📋 INDICE
1. [Panoramica del Progetto](#1-panoramica-del-progetto)
2. [Problemi Critici & Soluzioni](#2-problemi-critici--soluzioni)
3. [Architettura di Sistema](#3-architettura-di-sistema)
4. [Data Model (Schema DB Completo)](#4-data-model-schema-db-completo)
5. [Motore di Analisi](#5-motore-di-analisi)
6. [Specifiche API](#6-specifiche-api)
7. [Roadmap di Implementazione](#7-roadmap-di-implementazione)
8. [Stack Tecnico](#8-stack-tecnico)
9. [Deployment](#9-deployment)
10. [Known Issues & Limitazioni](#10-known-issues--limitazioni)
11. [Appendice: Formule & Reference](#11-appendice-formule--reference)

---

## 1. PANORAMICA DEL PROGETTO

### 1.1 Missione
WhaleRadarr analizza i report Commitments of Traders (COT) della CFTC per rilevare cambiamenti statisticamente significativi nel posizionamento istituzionale, fornendo alert contestualizzati al prezzo, normalizzati statisticamente e puliti dal rumore tecnico (rollover).

### 1.2 Core Value Proposition
- **Rigore Statistico:** Uso di Robust Z-scores (Mediana/IQR) resistenti agli outlier.
- **Contesto Prezzo Reale:** Analisi del VWAP settimanale per stimare se le "balene" stanno accumulando in profitto o assorbendo perdite.
- **Gestione Rollover:** Eliminazione dei falsi positivi tramite calendario scadenze deterministico.
- **Resilienza Dati:** Strategia multi-provider (Yahoo + Alpha Vantage fallback).
- **Metriche Duali:** Robust Z-score (shock short-term) + COT Index (estremi long-term).
- **Trasparenza:** Confidence score esplicito e indicazione chiara della fonte dati.

### 1.3 Cosa NON è WhaleRadarr
- ❌ **Non è Real-time:** I dati CFTC hanno 3 giorni di lag strutturale.
- ❌ **Non è Predittivo:** Mostra cosa è accaduto, non cosa accadrà.
- ❌ **Non è Consulenza Finanziaria:** Strumento puramente educativo/informativo.
- ❌ **Non è un Segnale di Trading:** Richiede interpretazione manuale.

### 1.4 Disclaimer sul Ritardo Dati
```text
┌─────────────────────────────────────────────────────────┐
│  CRITICO: Timeline dei Dati                             │
├─────────────────────────────────────────────────────────┤
│  Martedì:   Chiusura posizioni (snapshot CFTC)          │
│  Mercoledì: CFTC riceve i dati dai broker               │
│  Giovedì:   Validazione dati                            │
│  Venerdì:   Pubblicazione report (~15:30 EST)           │
│                                                         │
│  → 3 GIORNI DI LAG tra posizionamento e pubblicazione   │
│  → Il mercato ha scambiato Mer, Gio, Ven nel frattempo  │
└─────────────────────────────────────────────────────────┘
```

### 1.5 Data Source: TFF Report
**Report Utilizzato:** Traders in Financial Futures (TFF) - Futures-and-Options Combined.
- **Perché TFF Combined:** Copre tutti i mercati finanziari (indici, valute, treasury, crypto) e include le opzioni per una visione completa dell'Open Interest.
- **Categorie:** Dealer, Asset Manager, Leveraged Funds, Other.

---

## 2. PROBLEMI CRITICI & SOLUZIONI

### 2.1 Problema #1: Futures Rollover (MASSIMA CRITICITÀ)
**Il Problema:** Durante le scadenze trimestrali, il passaggio di Open Interest tra contratti genera falsi allarmi massicci (es. -90% su una scadenza, +450% sulla successiva).

**Soluzione A: Contratti Consolidated**
Uso di report CFTC "Consolidated" che aggregano tutti i mesi di scadenza, eliminando il 95% del rumore.

**Soluzione B: Calendario Scadenze Hardcodato**
Per contratti non consolidati, implementazione di regole di scadenza tramite `pandas_market_calendars`.

```python
EXPIRY_RULES = {
    'stock_index': {'months': [3, 6, 9, 12], 'day_rule': 'third_friday'},
    'treasury': {'months': [3, 6, 9, 12], 'day_rule': 'last_business_day'},
    'currency': {'months': [3, 6, 9, 12], 'day_rule': 'third_wednesday'}
}

def is_rollover_week(contract: Contract, report_date: date) -> bool:
    """ Rollover window: 5-15 giorni prima della scadenza """
    # Logica di calcolo basata su calendario
    ...
```

### 2.2 Problema #2: Allineamento Prezzo & Cost Basis
**Il Problema:** Il "Tuesday Close" ignora la volatilità settimanale. È fondamentale capire se gli acquisti sono avvenuti su forza o su debolezza.

**Soluzione: VWAP Window Reporting**
Calcoliamo il VWAP dalla data del report precedente (Mercoledì) a quella corrente (Martedì).
- **Close > VWAP:** Momentum / Forza.
- **Close < VWAP:** Absorption / Accumulo.

```python
def calculate_reporting_vwap(contract, current_date, prev_date):
    # Finestra: Mercoledì -> Martedì
    # VWAP = sum(Price * Volume) / sum(Volume)
    ...
```

### 2.3 Problema #3: Calcolo Percentuale Errato (BUG CRITICO)
🚨 **Il Paradosso del Denominatore**
- **ERRORE:** Usare l'OI corrente. Se l'OI crolla (rollover), l'impatto percentuale viene gonfiato.
- **CORRETTO:** Usare sempre l'**OI PRECEDENTE** come denominatore.

### 2.4 Problema #4: Distribuzioni Non Normali
**Soluzione: Statistica Robusta (Median & IQR)**
Sostituiamo Media e Deviazione Standard con Mediana e Interquartile Range per calcolare Z-Scores resistenti agli outlier.

```python
# Robust Z = (Valore - Mediana) / (IQR * 0.7413)
```

### 2.5 Problema #5: Affidabilità Dati Prezzo
**Soluzione: Pattern Fallback Chirurgico**
1. **Primario:** Yahoo Finance (Batch).
2. **Validazione:** Check qualità (volumi, gap, date).
3. **Fallback:** Alpha Vantage (Surgical) per i ticker falliti.

### 2.6 Problema #6: Gross Exposure (Hedge Funds)
**Il Problema:** Strategie delta-neutral nascondono aumenti di rischio se si guarda solo il Netto.
**Soluzione:** Tracciare la **Gross Exposure (Long + Short)** per rilevare "volatility plays".

---

## 3. ARCHITETTURA DI SISTEMA

### 3.1 Flusso Dati Completo
```text
┌────────────────────────────────────────────────────────────────┐
│                       CFTC Website                             │
│  Scarico Venerdì 20:00 UTC (Report TFF)                        │
└───────────────────────┬────────────────────────────────────────┘
                        │ [1] DOWNLOAD & PARSE
                        ▼
┌────────────────────────────────────────────────────────────────┐
│  Parser Service: Normalizzazione, Rollover, Gross Exposure     │
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

## 4. DATA MODEL (SCHEMA DB COMPLETO)

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

## 5. MOTORE DI ANALISI

### 5.1 Analyzer Completo (v2.5)
```python
def analyze_position(current, previous, stats, price_data, is_rollover):
    # 1. Delta con denominatore corretto (Previous OI)
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

## 6. SPECIFICHE API
- **GET /api/v1/alerts:** Filtri avanzati per confidenza, rollover e categoria.
- **GET /api/v1/contracts/{id}/analysis:** Grafici posizioni istituzionali vs Prezzo/VWAP.
- **GET /api/v1/analysis/extremes:** Identificazione asset in condizioni di iper-posizionamento.

---

## 7. ROADMAP DI IMPLEMENTAZIONE
- **Fase 1: Core (Settimane 1-4):** Ingestione CFTC, Parser TFF, Aliasing nomi, Rollover.
- **Fase 2: Stats & Price (Settimane 5-8):** Fetcher Resiliente, VWAP Window, Robust Stats.
- **Fase 3: Analysis (Settimane 9-12):** WhaleAnalyzer, Confidence Scoring, Gross Exposure.
- **Fase 4: API & UX (Settimane 13-16):** FastAPI, Auth, Watchlist.
- **Fase 5: Frontend (Settimane 17-20):** React Dashboard, Recharts Positioning.
- **Fase 6: Ops (Settimane 21-24):** Notifications (Telegram/Mail), Prometheus, Deploy.

---

## 8. STACK TECNICO
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

## 10. KNOWN ISSUES & LIMITAZIONI
1. **Lag Temporale (3 Giorni):** Il ritardo CFTC è strutturale (Martedì -> Venerdì).
2. **Stima VWAP:** Calcolato su dati Daily, è un'approssimazione del VWAP reale intraday.
3. **Contract Multipliers Gaps:** Differenze tra Standard e Micro possono distorcere l'analisi del valore monetario assoluto.
4. **Historical Name Drifting:** I nomi dei contratti nei file storici CFTC possono variare, richiedendo manutenzione degli alias.
5. **Non-Reportable Bias:** Il sentiment "Retail" è aggregato e include operatori di natura diversa.

---

## 11. APPENDICE: FORMULE & REFERENCE

### Robust Z-Score
$$Robust\ Z = \frac{Value - Median}{IQR \times 0.7413}$$

### Weekly VWAP (Reporting Window)
$$VWAP = \frac{\sum_{i=Wed}^{Tue} (TypicalPrice_i \times Volume_i)}{\sum_{i=Wed}^{Tue} Volume_i}$$

---
**Version:** 2.5 (FINAL)  
**Last Updated:** February 11, 2026  
**Status:** Ready for Implementation
