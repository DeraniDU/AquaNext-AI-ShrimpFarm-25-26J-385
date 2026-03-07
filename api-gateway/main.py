"""
API Gateway - Single entry point for frontend to AI Assistant and Feeding System.

Run: uvicorn main:app --reload --port 8000

Backends:
- AI Assistant (shrimp-farm-ai-assistant): http://127.0.0.1:8001
- Feeding System: http://127.0.0.1:8002

Frontend proxies /api -> http://127.0.0.1:8000
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
import httpx

app = FastAPI(
    title="API Gateway",
    description="Routes /api to AI Assistant and Feeding System",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

AI_ASSISTANT_BASE = "http://127.0.0.1:8001"
FEEDING_SYSTEM_BASE = "http://127.0.0.1:8002"
FEEDING_SYSTEM_PREFIX = "/api/feeding-system"

# Headers to forward (skip hop-by-hop and content-length; let httpx set them)
FORWARD_HEADERS = (
    "authorization",
    "content-type",
    "accept",
    "accept-encoding",
    "x-requested-with",
)


def _forward_headers(request: Request) -> dict:
    return {
        k: v
        for k, v in request.headers.items()
        if k.lower() in FORWARD_HEADERS
    }


@app.get("/api/health")
async def gateway_health():
    """Gateway health check (does not hit backends)."""
    from datetime import datetime
    return {"status": "ok", "service": "api-gateway", "time": datetime.utcnow().isoformat()}


@app.api_route("/api/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"])
async def proxy_api(request: Request, path: str):
    """
    Proxy /api/* to AI Assistant or Feeding System.
    - /api/feeding-system/* -> Feeding System (8002), path becomes /* (e.g. /batch, /feeding)
    - All other /api/* -> AI Assistant (8001), path unchanged
    """
    full_path = f"/api/{path}" if path else "/api"
    query = str(request.url.query) if request.url.query else ""

    if full_path.startswith(FEEDING_SYSTEM_PREFIX):
        # Strip /api/feeding-system and forward to feeding system
        backend_path = full_path[len(FEEDING_SYSTEM_PREFIX) :] or "/"
        target_base = FEEDING_SYSTEM_BASE
    else:
        backend_path = full_path
        target_base = AI_ASSISTANT_BASE

    url = f"{target_base}{backend_path}"
    if query:
        url += f"?{query}"

    headers = _forward_headers(request)
    body = await request.body()

    async with httpx.AsyncClient(timeout=120.0) as client:
        try:
            r = await client.request(
                request.method,
                url,
                headers=headers,
                content=body,
            )
            return Response(
                content=r.content,
                status_code=r.status_code,
                headers={
                    k: v
                    for k, v in r.headers.items()
                    if k.lower() not in ("transfer-encoding", "connection", "content-encoding")
                },
            )
        except httpx.ConnectError as e:
            return Response(
                content=b'{"detail":"Backend unreachable"}',
                status_code=503,
                media_type="application/json",
            )
        except Exception as e:
            return Response(
                content=f'{{"detail":"Gateway error: {str(e)}"}}'.encode(),
                status_code=502,
                media_type="application/json",
            )
