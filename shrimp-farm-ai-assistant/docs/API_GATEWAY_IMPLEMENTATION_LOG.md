# Implementation log: API gateway

**Project:** `shrimp-farm-ai-assistant`  
**Scope:** FastAPI backend gateway used by the React dashboard and other clients.  
**Main file:** `api/server.py`  
**Log prepared:** 2026-05-03

---

## Simple overview

The API gateway is the backend service that sits between the frontend dashboard and the AI farm management system.

In simple terms, it:

- receives requests from the web dashboard,
- collects data from agents or MongoDB,
- runs forecasting, benchmarking, feeding, labor, and harvest ML logic,
- formats the result as JSON,
- and sends it back to the frontend.

The gateway is built with **FastAPI** and is normally started with:

```powershell
.\venv\Scripts\python.exe -m uvicorn api.server:app --reload --port 8000
```

---

## Implementation steps

| Step | Work completed | Simple explanation |
|------|----------------|--------------------|
| 1 | Created FastAPI app | Added `app = FastAPI(...)` in `api/server.py` to expose backend routes. |
| 2 | Added API title and version | Named the service `Shrimp Farm Management API` with version `0.1.0`. |
| 3 | Added CORS support | Allowed the React Vite dashboard at `localhost:5173` to call the API during development. |
| 4 | Imported configuration values | Loaded farm settings, costs, budgets, MongoDB flags, cache settings, and coordinates from `config.py`. |
| 5 | Connected specialized agents | Imported water quality, feed prediction, energy optimization, labor optimization, manager, forecasting, benchmarking, and feeding optimizer agents. |
| 6 | Added lazy dashboard agents | Reused dashboard agents instead of creating new agent objects for every request. |
| 7 | Added dashboard cache | Added in-memory cache so repeated dashboard reloads can reuse a recent snapshot. |
| 8 | Added MongoDB direct dashboard path | When MongoDB is enabled, the dashboard can read latest `*_readings` directly from MongoDB instead of simulated data. |
| 9 | Added clear MongoDB errors | If MongoDB is disabled, unreachable, or missing readings, the API returns helpful error details. |
| 10 | Added cost summary helpers | Calculated feed, energy, labor, medicine, maintenance, revenue estimate, and profit estimate. |
| 11 | Added budget summary helpers | Compared actual/projected costs against weekly and cycle budgets. |
| 12 | Added savings opportunities | Generated cost-saving suggestions based on feed, energy, and labor values. |
| 13 | Added health endpoint | `/api/health` returns service status and time. |
| 14 | Added history endpoints | `/api/history` and `/api/history/hourly` return saved dashboard snapshots from MongoDB. |
| 15 | Added analytics chart endpoint | `/api/charts/analytics` provides chart-ready data for water, feed, and energy trends. |
| 16 | Added weather forecast endpoint | `/api/weather-forecast` calls Open-Meteo and normalizes weather data for the dashboard. |
| 17 | Added forecasting endpoint | `/api/forecasts` generates future farm forecasts using current data and historical snapshots. |
| 18 | Added harvest ML endpoint | `/api/harvest-ml` runs XGBoost harvest prediction when trained model files and MongoDB readings are available. |
| 19 | Added dashboard endpoint | `/api/dashboard` builds the main farm dashboard response used by the UI. |
| 20 | Added feeding optimization endpoints | `GET /api/feeding-optimization` uses generated/current data; `POST /api/feeding-optimization` uses dashboard-provided real data. |
| 21 | Added feeding activity endpoint | `/api/feeding-activity` builds feeding activity chart data from MongoDB feed readings. |
| 22 | Added labor optimization endpoint | `/api/labor-optimization` returns per-pond schedules, recommendations, and labor metrics. |
| 23 | Added benchmarking endpoint | `/api/benchmark` compares farm performance against targets and best-practice scores. |
| 24 | Added water quality endpoint | `/api/water-quality` returns water quality data for all requested ponds. |
| 25 | Added feeding data endpoint | `/api/feeding-data` returns feed data and feed efficiency for the requested ponds. |
| 26 | Added seed support | Several endpoints accept a `seed` value so simulated results can be reproduced. |
| 27 | Added parameter limits | Inputs such as ponds, hours, days, and forecast days are bounded to avoid unreasonable requests. |
| 28 | Added JSON serialization | Pydantic models are converted to JSON using `model_dump(mode=\"json\")` where needed. |
| 29 | Added fallback behavior | Some routes return empty/default data when MongoDB is disabled so the frontend can still render safely. |
| 30 | Added HTTP error responses | Used `HTTPException` and `JSONResponse` for clear API error behavior. |

---

## Main API endpoints

| Endpoint | Purpose in simple terms |
|----------|-------------------------|
| `GET /api/health` | Checks if the backend is running. |
| `GET /api/dashboard` | Main dashboard data for the frontend. |
| `GET /api/history` | Historical dashboard snapshots from MongoDB. |
| `GET /api/history/hourly` | Hourly historical snapshots from MongoDB. |
| `GET /api/charts/analytics` | Chart data for analytics and trends. |
| `GET /api/weather-forecast` | Weather forecast for farm location. |
| `GET /api/forecasts` | Farm operation forecasts. |
| `GET /api/harvest-ml` | Harvest prediction using trained ML models. |
| `GET /api/feeding-optimization` | Feeding recommendations using generated/current data. |
| `POST /api/feeding-optimization` | Feeding recommendations using real dashboard data sent by frontend. |
| `GET /api/feeding-activity` | Feeding activity chart data. |
| `GET /api/labor-optimization` | Labor schedule and efficiency recommendations. |
| `GET /api/benchmark` | Farm performance benchmarking. |
| `GET /api/water-quality` | Water quality readings by pond. |
| `GET /api/feeding-data` | Feed readings and feed efficiency. |

---

## Data flow in simple terms

1. The frontend sends a request to the API gateway.
2. The API checks query parameters such as pond count, seed, cache, costs, and budgets.
3. The API loads data either from MongoDB or from the farm agents.
4. The API runs extra logic if needed, such as forecasting, harvest ML, feeding optimization, labor optimization, or benchmarking.
5. The API converts the result into JSON.
6. The frontend receives the JSON and displays cards, charts, tables, and recommendations.

---

## Important implementation details

### MongoDB behavior

- When `USE_MONGODB=true`, the gateway can read real readings through `DataRepository`.
- When `DASHBOARD_MONGO_DIRECT=true`, `/api/dashboard` reads latest MongoDB readings directly.
- When required MongoDB readings are missing, the gateway returns a clear message showing which pond and collection is missing.
- Some analytics endpoints return empty chart payloads when MongoDB is disabled, so the frontend can still load.

### Dashboard caching

- `_DASHBOARD_CACHE` stores recent dashboard snapshots in memory.
- `DASHBOARD_CACHE_TTL_S` controls the default cache time.
- The `fresh=true` query parameter bypasses the cache.

### Cost and budget logic

- Cost values can come from environment variables or query parameters.
- The gateway calculates feed, energy, labor, medicine, and maintenance cost summaries.
- Budget helpers compare current/projected costs against weekly and cycle budgets.

### External weather data

- `/api/weather-forecast` calls the Open-Meteo API.
- Weather response data is simplified into hourly rows, daily rows, and farm-friendly notes.

### Harvest ML

- `/api/harvest-ml` loads trained model files through `HarvestMLPredictor`.
- It requires MongoDB water quality and feed readings.
- If model files or readings are missing, the endpoint returns `source: unavailable` or per-pond availability messages.

---

## Verification checklist

Use this checklist after changing the API gateway:

1. Start the backend with `uvicorn api.server:app --reload --port 8000`.
2. Open `http://localhost:8000/api/health` and confirm it returns `status: ok`.
3. Run the React dashboard and confirm it can call the API from `localhost:5173`.
4. Test `/api/dashboard` with default settings.
5. Test `/api/dashboard?fresh=true` to bypass cache.
6. Test with `USE_MONGODB=false` and confirm simulated/agent data still works where supported.
7. Test with `USE_MONGODB=true` and confirm MongoDB-backed endpoints return real readings.
8. Test `/api/history`, `/api/charts/analytics`, and `/api/feeding-activity` when MongoDB has data.
9. Test `/api/harvest-ml` only after harvest model files and MongoDB readings are available.
10. Confirm error responses are readable and helpful when data is missing.

---

## Change log

| Date | Author | Summary |
|------|--------|---------|
| 2026-05-03 | — | Created simple implementation log for the FastAPI gateway. |

Add new rows here whenever API routes, request parameters, MongoDB behavior, cache behavior, or response formats are changed.
