# Sudoku Frontend

React/Vite/Tailwind SPA for the Sudoku backend.

## Setup

```powershell
cd frontend
npm install
Copy-Item .env.example .env
npm run dev
```

Fill `frontend/.env` with your Supabase project URL and **public anon key**. Never put the service-role key in frontend environment variables.

The backend defaults to `http://localhost:8000`, and its `CORS_ORIGINS` should include `http://localhost:5173`.

## Checks

```powershell
npm run lint
npm test
npm run build
```
