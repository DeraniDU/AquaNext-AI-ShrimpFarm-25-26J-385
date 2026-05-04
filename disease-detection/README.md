# Disease Detection Backend

This service exposes a FastAPI application that performs risk predictions and stores
results in MongoDB (optional).

## MongoDB Configuration

The service can run **with or without MongoDB**:

- If you provide credentials, it will connect and persist predictions.
- If you do **not** provide credentials, it will run in **dummy/in-memory mode** (no DB writes).

Environment variables:

- `MONGO_URI`: Mongo connection string
- `DB_NAME`: database name
- `DB_ENABLED` (optional): set to `true`/`1` to force-enable DB (if connection fails it will still fall back to no-DB mode)

To connect to an Atlas cluster, set the environment variable before starting the
server. For example (PowerShell):

```powershell
$env:MONGO_URI = "mongodb+srv://<user>:<pass>@<cluster>/<params>"
$env:DB_NAME  = "shrimp_farm_iot"
uvicorn api.server:app --reload
```

Alternatively you can create a `.env` file or modify `config.py` directly, but
**do not commit credentials** to source control.

---

Other configuration values (ports, model paths, etc.) can also be overridden
via environment variables.

For further development instructions, see the top‑level `README.md` of the
project.
