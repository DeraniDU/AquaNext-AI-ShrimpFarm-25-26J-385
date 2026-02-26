# Quick Start Guide

## Terminal 1: Backend API (Port 5000)

```powershell
cd backend
python app.py
```

Wait for: `Running on http://127.0.0.1:5000`

## Terminal 2: React Frontend (Port 3000)

```powershell
cd backend\dashboard
npm start
```

Wait for: Browser to open automatically at `http://localhost:3000`

---

**That's it!** Both servers must run simultaneously.

**Note:** If the backend shows errors about `models.pkl`, the API will still work but return default/empty data.


