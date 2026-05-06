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
