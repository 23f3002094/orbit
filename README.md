# Orbit

Orbit is a calendar-first productivity and accountability app.

## Repository layout

- `frontend/` — the future Next.js application
- `backend/` — the FastAPI API

## Run the backend

From PowerShell:

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload
```

Then open [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health). Interactive API documentation is available at [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs).
