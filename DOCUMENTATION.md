# WhaleRadarr - Documentazione Tecnica

Questo documento fornisce una descrizione dettagliata dell'architettura, dei modelli di dati e dei processi implementati in WhaleRadarr.

## 1. Modello dei Dati

Il database PostgreSQL è il cuore della piattaforma e memorizza tutti i dati relativi a contratti, report, prezzi e analisi. Lo schema è progettato per garantire coerenza, performance e integrità dei dati.

```sql
-- Tabella dei contratti futures analizzati
CREATE TABLE contracts (
    id SERIAL PRIMARY KEY,
    cftc_contract_code VARCHAR(20) UNIQUE NOT NULL, -- Codice univoco del contratto per la CFTC
    contract_name VARCHAR(255) NOT NULL,            -- Nome leggibile del contratto (es. "S&P 500 E-MINI")
    market_category VARCHAR(50) NOT NULL,           -- Categoria di mercato (es. "Indici Azionari", "Valute")
    yahoo_ticker VARCHAR(20),                       -- Ticker per Yahoo Finance
    alpha_vantage_ticker VARCHAR(20),               -- Ticker per Alpha Vantage (fallback)
    expiry_rule VARCHAR(50),                        -- Regola per il calcolo della scadenza (es. "third_friday")
    expiry_months INTEGER[],                        -- Mesi di scadenza (es. [3, 6, 9, 12])
    is_consolidated BOOLEAN DEFAULT false,          -- Se il report CFTC è già consolidato
    is_active BOOLEAN DEFAULT true,                 -- Se il contratto è attualmente monitorato
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabella dei report settimanali della CFTC
CREATE TABLE weekly_reports (
    id SERIAL PRIMARY KEY,
    contract_id INTEGER REFERENCES contracts(id),
    report_date DATE NOT NULL,                      -- Data del report (sempre un martedì)
    dealer_long BIGINT,                             -- Posizioni Long dei Dealer
    dealer_short BIGINT,                            -- Posizioni Short dei Dealer
    asset_mgr_long BIGINT,                          -- Posizioni Long degli Asset Manager
    asset_mgr_short BIGINT,                         -- Posizioni Short degli Asset Manager
    lev_money_long BIGINT,                          -- Posizioni Long dei Leveraged Money (Hedge Fund)
    lev_money_short BIGINT,                         -- Posizioni Short dei Leveraged Money
    lev_money_gross_total BIGINT GENERATED ALWAYS AS (lev_money_long + lev_money_short) STORED, -- Esposizione lorda
    open_interest BIGINT NOT NULL,                  -- Open Interest totale per quel contratto
    is_rollover_week BOOLEAN DEFAULT false,         -- Flag che indica se la settimana è di rollover
    UNIQUE(contract_id, report_date)
);

-- Tabella dei dati di prezzo settimanali
CREATE TABLE weekly_prices (
    id SERIAL PRIMARY KEY,
    contract_id INTEGER REFERENCES contracts(id),
    report_date DATE NOT NULL,                      -- Data del report a cui il prezzo è associato
    close_price DECIMAL(12, 4),                     -- Prezzo di chiusura del martedì
    reporting_vwap DECIMAL(12, 4),                  -- VWAP calcolato nella finestra temporale del report (Mer-Mar)
    close_vs_vwap_pct DECIMAL(10, 2),               -- Variazione % tra chiusura e VWAP
    data_source VARCHAR(20),                        -- Fonte del dato (es. "Yahoo Finance", "Alpha Vantage")
    UNIQUE(contract_id, report_date)
);

-- Tabella per le statistiche rolling (mediana, IQR, min, max)
CREATE TABLE contract_statistics (
    id SERIAL PRIMARY KEY,
    contract_id INTEGER REFERENCES contracts(id),
    trader_category VARCHAR(20),                    -- Categoria di operatore (es. "asset_mgr", "lev_money")
    position_type VARCHAR(10),                      -- Tipo di posizione (es. "long", "short", "net")
    rolling_median DECIMAL(15, 2),                  -- Mediana mobile (es. 26 settimane)
    rolling_iqr DECIMAL(15, 2),                     -- Interquartile Range mobile
    all_time_min DECIMAL(15, 2),                    -- Minimo storico
    all_time_max DECIMAL(15, 2),                    -- Massimo storico
    UNIQUE(contract_id, trader_category, position_type)
);

-- Tabella per gli alert generati
CREATE TABLE whale_alerts (
    id SERIAL PRIMARY KEY,
    contract_id INTEGER REFERENCES contracts(id),
    report_date DATE NOT NULL,
    alert_level VARCHAR(20),                        -- Livello dell'alert (es. "High", "Medium", "Low")
    z_score DECIMAL(10, 4),                         -- Robust Z-score calcolato
    cot_index DECIMAL(5, 2),                        -- COT Index (0-100)
    price_context VARCHAR(50),                      -- Contesto di prezzo (es. "Accumulation", "Momentum")
    confidence_score DECIMAL(5, 2),                 -- Punteggio di affidabilità dell'alert
    is_rollover_week BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 2. Processo di Ingestione Dati

Il processo di ingestione è orchestrato da una serie di script Python e servizi che si occupano di recuperare, pulire e memorizzare i dati.

### 2.1 `cot_loader.py` - Caricamento Report CFTC

-   **Scopo**: Automatizzare il download e il parsing dei report "Traders in Financial Futures" dal sito della CFTC.
-   **Trigger**: Eseguito ogni venerdì sera, dopo la pubblicazione dei dati da parte della CFTC.
-   **Funzionamento**:
    1.  Scarica il file ZIP contenente i report.
    2.  Estrae il file di testo (`fut_fin_xls.txt`).
    3.  Legge il file, ignorando le righe di intestazione e piè di pagina.
    4.  Per ogni riga, esegue il parsing dei campi di interesse, mappando i nomi dei contratti CFTC ai nomi interni del sistema.
    5.  Popola la tabella `weekly_reports` con i dati normalizzati.

### 2.2 `price_loader.py` - Caricamento Dati di Prezzo

-   **Scopo**: Arricchire i report settimanali con dati di prezzo e volume.
-   **Trigger**: Eseguito dopo il `cot_loader.py`.
-   **Funzionamento**:
    1.  Per ogni nuovo report in `weekly_reports`, identifica il `contract_id` e il `report_date`.
    2.  Utilizza il ticker associato al contratto (prima `yahoo_ticker`) per interrogare l'API di **Yahoo Finance**.
    3.  Recupera i dati giornalieri di Prezzo (OHLC) e Volume per la finestra temporale di interesse (da mercoledì a martedì).
    4.  **In caso di fallimento** (es. ticker non trovato, dati incompleti), esegue un tentativo di fallback utilizzando `alpha_vantage_ticker` e l'API di **Alpha Vantage**.
    5.  Calcola il **VWAP** per la finestra di reporting.
    6.  Memorizza i risultati (prezzo di chiusura, VWAP, fonte dati) nella tabella `weekly_prices`.

## 3. API (In Sviluppo)

Le API RESTful saranno sviluppate utilizzando **FastAPI** per esporre i dati e le analisi al frontend. Di seguito le specifiche preliminari.

### GET `/api/v1/alerts`

-   **Descrizione**: Ritorna una lista di `Whale Alerts`, con possibilità di filtraggio avanzato.
-   **Parametri di Query**:
    -   `min_confidence` (float): Filtra per punteggio di confidenza minimo.
    -   `contract_category` (str): Filtra per categoria di mercato (es. "currency").
    -   `start_date` / `end_date` (date): Filtra per intervallo di date.
    -   `include_rollover` (bool): Include o esclude gli alert avvenuti in settimane di rollover.
-   **Risposta**: Array di oggetti `WhaleAlert`.

### GET `/api/v1/contracts/{contract_id}/analysis`

-   **Descrizione**: Fornisce dati completi per un singolo contratto, utili per la visualizzazione di grafici.
-   **Risposta**: Un oggetto contenente:
    -   Dettagli del contratto.
    -   Serie storica delle posizioni nette per ogni categoria di operatore.
    -   Serie storica dei prezzi di chiusura e del VWAP.
    -   Lista degli alert storici per quel contratto.

### GET `/api/v1/analysis/extremes`

-   **Descrizione**: Identifica i mercati che si trovano in condizioni di posizionamento estremo, basandosi sul **COT Index**.
-   **Parametri di Query**:
    -   `category` (str): "asset_mgr" o "lev_money".
    -   `position` (str): "long" o "short".
    -   `threshold` (int): Soglia per il COT Index (es. > 90 o < 10).
-   **Risposta**: Lista di contratti che soddisfano i criteri, ordinati per vicinanza all'estremo.
