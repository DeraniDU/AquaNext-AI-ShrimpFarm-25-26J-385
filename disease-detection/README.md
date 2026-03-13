# Disease Detection Backend

This service exposes a FastAPI application that performs risk predictions and stores
results in MongoDB.

## MongoDB Configuration

The code reads `MONGODB_URI` and `MONGODB_DB` from the environment via
`config.Settings`. By default it will point at a local MongoDB instance
(`mongodb://localhost:27017`) and the database name `shrimp_ai_db`.

To connect to an Atlas cluster, set the environment variable before starting the
server. For example (PowerShell):

```powershell
$env:MONGODB_URI = \
"mongodb+srv://piyumalipalihawadana_db_user:palihe1234@cluster0.ni5ykui.mongodb.net/?appName=Cluster0"
$env:MONGODB_DB  = "your_db_name"   # optional, defaults to shrimp_ai_db
uvicorn api.server:app --reload
```

Alternatively you can create a `.env` file or modify `config.py` directly, but
**do not commit credentials** to source control.

---

Other configuration values (ports, model paths, etc.) can also be overridden
via environment variables.

For further development instructions, see the top‑level `README.md` of the
project.

## MongoDB TLS errors on Windows (`TLSV1_ALERT_INTERNAL_ERROR`)

If the app logs *SSL handshake failed* / *tlsv1 alert internal error* when
connecting to Atlas, typical causes are:

1. **Python/OpenSSL** — Use a **3.12** venv (avoid 3.10; 3.14 may lack wheels).
2. **Network** — Corporate proxy or antivirus SSL inspection. Try another
   network (e.g. hotspot) or exclude `*.mongodb.net`.
3. **Atlas** — **Network Access** must allow your current IP.

### Optional env workarounds (disease-detection only)

In `.env` or the shell:

| Variable | Purpose |
|----------|--------|
| `DISABLE_MONGO=1` | Skip MongoDB and use dummy/in-memory data. |
| `MONGO_TLS_INSECURE=1` | **Dev only** — `tlsAllowInvalidCertificates=True`. If the connection still fails, the problem is not certificate validation (ciphers/proxy). |
| `MONGO_TLS_DISABLE_OCSP=1` | Disables OCSP checks (some networks block OCSP). |
| `MONGO_TLS_NO_CERTIFI=1` | Do not pass `tlsCAFile=certifi`; uses default CA store only. |

After changing TLS env vars, restart the API. Remove insecure flags for
production.

## Data flow (why nothing shows in GET /predictions)

1. **MongoDB down** — Predictions are stored in **process memory** only
   (`pond_prediction_store`). They **disappear on reload** and are not
   shared across multiple workers.

2. **Background recalc** — After `/behavior/live` or `/feeding/live`, the
   scheduler runs `recalculate_for_pond`. It now saves via the same
   `PredictionRepository` as `POST /predict-risk`, so **GET /predictions**
   lists both manual and automatic predictions when Mongo is up or when
   using the same in-memory process.

3. **CORS** — If the frontend runs on a port other than 5173/3000, add it:
   `CORS_ORIGINS=http://localhost:YOURPORT` in `.env`, or for local dev only
   `CORS_ALLOW_ALL=1` (disables credentialed cookies for that mode).

4. **Health check** — `GET /health` returns `mongo_connected` and in-memory
   counts so you can see whether data is in RAM only.

## Initializing the DB connection

The app initializes MongoDB **before** creating repositories so reads/writes
use Atlas when possible.

- **Startup** — `MongoDB.init_connection()` runs at import (if not already
  connected) and again in the FastAPI **lifespan** hook when the server starts.
- **Shutdown** — `MongoDB.disconnect()` closes the client cleanly.

Optional `.env` for flaky networks:

| Variable | Default | Meaning |
|----------|---------|--------|
| `MONGO_CONNECT_RETRIES` | `1` | Number of connect attempts |
| `MONGO_CONNECT_RETRY_DELAY_SEC` | `2` | Seconds between attempts |

Example:

```env
MONGO_CONNECT_RETRIES=3
MONGO_CONNECT_RETRY_DELAY_SEC=5
```

If TLS still fails, fix network/Python as in the TLS section above; retries
cannot fix a persistent SSL handshake error.
