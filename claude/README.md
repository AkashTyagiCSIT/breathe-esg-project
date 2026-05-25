# Breathe ESG — Emissions Data Platform

Django REST + React app for ESG emissions data ingestion, normalization, and analyst review.

## Local Setup

### Backend (Render)

1. Push to GitHub
2. Create new Web Service on render.com from GitHub repo
3. Set Root Directory: `claude`
4. Add PostgreSQL database and copy `DATABASE_URL`
5. Set env vars: `SECRET_KEY`, `DEBUG=False`, `ALLOWED_HOSTS=*`, `DATABASE_URL`
6. Start Command: `gunicorn breathe_esg.wsgi`

Backend runs at http://localhost:8000

### Frontend

```bash
cd frontend
npm install
# Create .env file:
echo "REACT_APP_API_URL=http://localhost:8000/api" > .env
npm start
```

Frontend runs at http://localhost:3000

### Demo credentials

| Username | Password | Role |
|---|---|---|
| analyst | analyst123 | Analyst |
| admin | admin123 | Admin |

### Sample data

Upload files from `sample_data/` on the Ingest page:
- `sap_fuel.csv` → SAP source
- `utility_electricity.csv` → Utility source
- `travel_concur.csv` → Travel source

## Deployment

### Backend (Railway)

1. Push to GitHub
2. New project on railway.app → Deploy from GitHub repo
3. Add PostgreSQL plugin
4. Set env vars: `SECRET_KEY`, `DEBUG=False`
5. Railway auto-injects `DATABASE_URL`

### Frontend (Vercel)

1. Push `frontend/` to GitHub (or same repo)
2. Import on vercel.com
3. Set `REACT_APP_API_URL` to your Railway backend URL
4. Deploy

## Architecture

```
breathe_esg/     Django project settings + urls
tenants/         Tenant, TenantMembership models
emissions/       EmissionRecord, IngestionRun models + API
ingestion/       CSV parsers for SAP, Utility, Travel
review_dashboard/ Analyst review + bulk review endpoints
audit/           AuditLog model + read endpoint
frontend/        React app (CRA)
sample_data/     Realistic sample CSVs for all 3 sources
```

## Key documents

- `MODEL.md` — Data model design and rationale
- `DECISIONS.md` — Every ambiguity resolved
- `TRADEOFFS.md` — Three deliberate omissions
- `SOURCES.md` — Research on each data source
