# How to Run the App: Dashboard (AI Assistant) + Feeding Both Working

Use **Setup B** below so you can see **both** the AI Assistant dashboard and the Feeding tab.

---

## One-time setup (fixes Dashboard on 5173)

Run once so the **AI Assistant / Dashboard** works (fixes "No module named 'pymongo'" and "cannot import name 'DataRepository'"):

```
cd D:\Year4\PP1\AquaNext-AI-ShrimpFarm-25-26J-385\shrimp-farm-ai-assistant; .\venv\Scripts\activate; pip install pymongo
```

---

## Setup B – Dashboard + Feeding (5 terminals)

Open **5 separate terminals**. Copy-paste **one command per terminal** (one line each). Leave each running.

---

### Terminal 1 – AI Assistant (port 8001)

Copy-paste this **one line**:

```
cd D:\Year4\PP1\AquaNext-AI-ShrimpFarm-25-26J-385\shrimp-farm-ai-assistant; .\venv\Scripts\activate; .\venv\Scripts\python.exe -m uvicorn api.server:app --reload --port 8001
```

---

### Terminal 2 – Feeding backend (port 8002)

Copy-paste this **one line**:

```
cd D:\Year4\PP1\AquaNext-AI-ShrimpFarm-25-26J-385\feeding-system; .\venv\Scripts\activate; uvicorn app.main:app --host 0.0.0.0 --port 8002
```

---

### Terminal 3 – API Gateway (port 8000)

Copy-paste this **one line**:

```
cd D:\Year4\PP1\AquaNext-AI-ShrimpFarm-25-26J-385\api-gateway; pip install -r requirements.txt; uvicorn main:app --reload --port 8000
```

---

### Terminal 4 – Feeding frontend (port 5174)

**Important:** Run this from `frontend/feeding-system` so the app loads `.env` and uses the gateway. If the console shows `API Base URL: http://127.0.0.1:8000` (without `/api/feeding-system`), stop the server (Ctrl+C) and start it again with the command below.

Copy-paste this **one line**:

```
cd D:\Year4\PP1\AquaNext-AI-ShrimpFarm-25-26J-385\frontend\feeding-system; npm run dev
```

---

### Terminal 5 – Main app (port 5173)

Copy-paste this **one line**:

```
cd D:\Year4\PP1\AquaNext-AI-ShrimpFarm-25-26J-385\frontend\web; npm run dev
```

---

## Verify each service (optional)

After starting all 5 terminals, open these in your browser:

- **Gateway:** http://127.0.0.1:8000/api/health → should show `{"status":"ok",...}`
- **AI Assistant:** http://127.0.0.1:8000/api/dashboard?ponds=4 → JSON or error message
- **Feeding:** http://127.0.0.1:8000/api/feeding-system/batch → `[]` or list of batches

---

## Open the app

1. In your browser go to: **http://localhost:5173**
2. Click **Dashboard** – you should see AI Assistant data (no “API error”).
3. Click **Feeding** – you should see the feeding UI (batches / “Add New Tank”), not “Failed to load data”.

---

## If something doesn’t work

- **Dashboard shows “API error”**  
  Terminal 1 (AI Assistant) or Terminal 3 (Gateway) may not be running, or the AI Assistant is crashing. Look at **Terminal 1** for a Python traceback. The error card now shows the server message (e.g. `API 500: ModuleNotFoundError: ...`). Fix that in the AI Assistant (e.g. install missing package).

- **Feeding tab shows “Failed to load data” or “No tanks yet”**  
  Make sure Terminal 2 (Feeding 8002) and Terminal 3 (Gateway 8000) and Terminal 4 (Feeding frontend 5174) are running. The file `frontend/feeding-system/.env` must contain:  
  `VITE_API_BASE_URL=http://127.0.0.1:8000/api/feeding-system`  
  **Restart Terminal 4** (Ctrl+C, then `npm run dev`) so the feeding app uses the gateway. Check http://127.0.0.1:8000/api/feeding-system/batch in the browser—it should return the same JSON as 8002/batch.

- **Gateway 503 or “Backend unreachable”**  
  Start Terminal 1 and Terminal 2 before or with Terminal 3.

---

## Quick checklist

| Terminal | Service        | Port | Must be running for |
|----------|----------------|------|----------------------|
| 1        | AI Assistant   | 8001 | Dashboard            |
| 2        | Feeding backend| 8002 | Feeding tab          |
| 3        | API Gateway    | 8000 | Both (routes traffic)|
| 4        | Feeding frontend | 5174 | Feeding tab in iframe |
| 5        | Main app       | 5173 | Browser at localhost:5173 |


