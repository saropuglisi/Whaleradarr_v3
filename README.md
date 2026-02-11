# WhaleRadarr v2.5

**Advanced Institutional Positioning Tracking Platform for Financial Futures**

WhaleRadarr è una piattaforma analitica che processa i report Commitments of Traders (COT) della CFTC per identificare cambiamenti significativi nel posizionamento istituzionale ("Whales"). Utilizza metriche statistiche robuste (Z-scores basati su Mediana/IQR) e analisi contestuale del prezzo (VWAP) per fornire insight privi del rumore tipico dei periodi di rollover.

## 🏗 Architettura

Il progetto è strutturato come un monorepo:

- **`/backend`**: API RESTful sviluppata in **Python 3.11** con **FastAPI**. Gestisce l'ingestione dati, l'analisi statistica (Pandas/SciPy) e la persistenza.
- **`/frontend`**: Dashboard interattiva sviluppata in **React 18**, **Vite** e **Tailwind CSS**.
- **Infrastructure**: Stack containerizzato con **Docker Compose** (App, PostgreSQL 14, Redis 7).

## 🚀 Quick Start

### Prerequisiti
- Docker & Docker Compose
- Node.js 18+ (per sviluppo locale frontend)
- Python 3.11+ (per sviluppo locale backend)

### Avvio con Docker (Raccomandato)

```bash
# Avvia l'intero stack (DB, Redis, Backend)
docker-compose up -d --build
```

### Sviluppo Locale

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## 🛠 Stack Tecnico

- **Backend:** FastAPI, SQLAlchemy 2.0, Pydantic, Pandas, NumPy.
- **Database:** PostgreSQL 14, Redis.
- **Frontend:** React, Recharts, Tailwind CSS, Axios.
- **Dati:** CFTC (TFF Report), Yahoo Finance, Alpha Vantage.

## 📄 License
Private / Proprietary
