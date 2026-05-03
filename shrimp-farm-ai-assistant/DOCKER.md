# Docker deployment

This component runs as two containers:

- `api`: FastAPI backend on port `8000`
- `web`: nginx serving the React dashboard on port `8080`, with `/api/*` proxied to `api:8000`

## Prerequisites

- Docker Desktop
- A `.env` file in this folder for runtime secrets and farm configuration

Minimum useful `.env` values:

```env
OPENAI_API_KEY=your_openai_key
OPENAI_MODEL_NAME=gpt-4o-mini
USE_MONGODB=false
MONGO_URI=
MONGO_DB_NAME=shrimp_farm
```

For MongoDB-backed dashboards:

```env
USE_MONGODB=true
MONGO_URI=mongodb+srv://user:password@cluster.example.mongodb.net/
MONGO_DB_NAME=shrimp_farm
```

## Run locally

From this folder:

```powershell
docker compose up --build
```

Open:

```text
http://localhost:8080
```

Useful checks:

```text
http://localhost:8000/api/health
http://localhost:8080/api/health
```

Stop containers:

```powershell
docker compose down
```

## Build images separately

Backend:

```powershell
docker build -t shrimp-farm-ai-api .
docker run --env-file .env -p 8000:8000 shrimp-farm-ai-api
```

Frontend:

```powershell
docker build -t shrimp-farm-ai-web ./web
docker run -p 8080:80 shrimp-farm-ai-web
```

The standalone frontend image expects an upstream named `api` inside the Docker network. For local full-stack use, prefer `docker compose up --build`.

## AWS notes

For AWS, deploy either:

- both containers to ECS/Fargate, or
- the backend image to App Runner/ECS and the built frontend to S3 + CloudFront.

Set `API_CORS_ORIGINS` to the deployed frontend URL if the browser calls the backend directly:

```env
API_CORS_ORIGINS=https://your-cloudfront-domain.com,https://yourdomain.com
```

If CloudFront or nginx proxies `/api/*` to the backend under the same domain, CORS is less important because requests are same-origin.
