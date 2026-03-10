# API Gateway

Single entry point for the frontend to reach the **AI Assistant** and **Feeding System** backends.

## Ports

| Service        | Port | Description                    |
|----------------|------|--------------------------------|
| API Gateway    | 8000 | This app (frontend proxy target) |
| AI Assistant   | 8001 | shrimp-farm-ai-assistant       |
| Feeding System | 8002 | feeding-system                 |

## Routing

- **`/api/health`** – Gateway health (does not call backends).
- **`/api/feeding-system/*`** – Proxied to Feeding System (8002). Path is rewritten: `/api/feeding-system/batch` → `http://8002/batch`.
- **All other `/api/*`** – Proxied to AI Assistant (8001) as-is (e.g. `/api/dashboard`, `/api/history`).

## Run

### 1. Install dependencies

```bash
cd api-gateway
pip install -r requirements.txt
```

### 2. Start backends (in separate terminals)

**Important:** Run each service from **its own directory**. Do not run the AI Assistant from inside `api-gateway`.

**AI Assistant** (port 8001) – run from the shrimp-farm-ai-assistant folder only:

```bash
# From project root, go to the AI Assistant project first:
cd web/app/ai-assistant/shrimp-farm-ai-assistant
uvicorn api.server:app --reload --port 8001
```

Or if using the top-level clone:

```bash
cd shrimp-farm-ai-assistant
uvicorn api.server:app --reload --port 8001
```

**Feeding System** (port 8002):

```bash
cd feeding-system
uvicorn app.main:app --reload --port 8002
```

### 3. Start the gateway (from api-gateway folder)

```bash
cd api-gateway
uvicorn main:app --reload --port 8000
```

Note: The gateway app is `main:app` (in `api-gateway/main.py`). The AI Assistant app is `api.server:app` (in the shrimp-farm-ai-assistant project).

### 4. Start the frontend

Frontend Vite proxy should target `http://127.0.0.1:8000` for `/api`. Then:

```bash
cd frontend/web
npm run dev
```

## Calling Feeding System from the frontend

Use the `/api/feeding-system/` prefix so the gateway routes to the feeding backend:

- `GET /api/feeding-system/batch` → Feeding System `/batch`
- `POST /api/feeding-system/feeding` → Feeding System `/feeding`
- `GET /api/feeding-system/motor/status` → Feeding System `/motor/status`
- etc.

AI Assistant endpoints are unchanged: `/api/dashboard`, `/api/history`, `/api/forecasts`, etc.

---

## How to verify it's working

Start all three services (AI Assistant on 8001, Feeding System on 8002, Gateway on 8000), then run these checks.

### 1. Gateway is up

```bash
curl http://127.0.0.1:8000/api/health
```

Expected: JSON with `"status": "ok"` and `"service": "api-gateway"`.

### 2. AI Assistant through the gateway

```bash
curl "http://127.0.0.1:8000/api/dashboard?ponds=2"
```

Expected: Large JSON (dashboard data). If you get `503` or "Backend unreachable", the AI Assistant is not running on port 8001.

### 3. Feeding System through the gateway

```bash
curl http://127.0.0.1:8000/api/feeding-system/batch
```

Expected: JSON (e.g. list of batches or `[]`). If you get `503`, the Feeding System is not running on port 8002.

### 4. Frontend (browser)

1. Start the frontend: `cd frontend/web && npm run dev`.
2. Open http://localhost:5173 (or the URL Vite shows).
3. Use the dashboard: it should load data from `/api/dashboard` via the gateway. If the dashboard shows data, the full chain (frontend → gateway → AI Assistant) is working.

### Quick checklist

| Check | Command or action | OK when |
|-------|-------------------|--------|
| Gateway | `curl http://127.0.0.1:8000/api/health` | JSON with `"service": "api-gateway"` |
| AI Assistant via gateway | `curl "http://127.0.0.1:8000/api/dashboard?ponds=1"` | JSON dashboard payload (not 503) |
| Feeding via gateway | `curl http://127.0.0.1:8000/api/feeding-system/batch` | JSON (not 503) |
| Frontend | Open http://localhost:5173, use dashboard | Data loads |
