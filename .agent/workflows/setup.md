---
description: how to fully initialize the Whaleradarr project with data
---

To fully initialize the Whaleradarr project and populate it with data, follow these steps sequentially:

1. **Start the Infrastructure**
   ```bash
   docker-compose up -d --build
   ```

2. **Initialize Database & Ingest Historical Data**
   Run the historical setup script inside the backend container.
   ```bash
   docker exec -e POSTGRES_HOST=postgres -e POSTGRES_PORT=5432 whaleradarr-backend python scripts/setup_historical.py
   ```

3. **Create SQL Views** (CRITICAL for dashboard data)
   ```bash
   docker exec -e POSTGRES_HOST=postgres -e POSTGRES_PORT=5432 whaleradarr-backend python scripts/setup_views.py
   ```

4. **Ingest Market Prices**
   ```bash
   docker exec -e POSTGRES_HOST=postgres -e POSTGRES_PORT=5432 whaleradarr-backend python scripts/setup_prices.py
   ```

5. **Run Analysis Pipeline**
   ```bash
   docker exec -e POSTGRES_HOST=postgres -e POSTGRES_PORT=5432 whaleradarr-backend python scripts/run_analysis_pipeline.py
   ```

6. **Start Frontend**
   In the `frontend` directory:
   ```bash
   npm install && npm run dev
   ```

7. **Verify**
   Check `http://localhost:8000/health` (Backend) and `http://localhost:5173` (Frontend).
