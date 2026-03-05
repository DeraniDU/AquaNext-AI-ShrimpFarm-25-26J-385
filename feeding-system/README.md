# Feeding System Backend (FastAPI)
This folder contains the **Feeding System** backend for the AquaNext AI Shrimp Farm project.  
It is a FastAPI service that exposes all feeding-related APIs (batches, AI feeding, motor status, analytics, etc.).
---
## 1. Prerequisites
- Python 3.10+ installed
- `pip` available in PATH
---
## 2. How to run the backend (local)
### Step 1 – Go to this folder
From the root of the repo:
```bash
cd feeding-system
Step 2 – Create and activate virtual environment
python -m venv venv
venv\Scripts\activate   # Windows
# source venv/bin/activate   # Linux/Mac
Step 3 – Install dependencies
pip install -r requirements.txt
Step 4 – Start FastAPI server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
The API documentation will be available at:

http://127.0.0.1:8000/docs
3. Relation to Frontend
The current feeding frontend (React/Vite) is in a separate project (not in this repo):

Local path on developer machine (example):
D:\Year4\PP1\shrimp_feeding_fastapi\frontend
That frontend expects this backend at:

http://127.0.0.1:8000
So for local development:

Start this backend (steps above).

In another terminal, start the frontend:

cd D:\Year4\PP1\shrimp_feeding_fastapi\frontend
npm install     # first time only
npm run dev
4. Project Structure (this component)
feeding-system/
  api/
    server.py           # Optional runner for uvicorn
  app/                  # FastAPI backend package
    main.py             # FastAPI app entrypoint
    core/
    database/
    routes/
    schemas/
    services/
    utils/
    models/
  requirements.txt       # Python dependencies
  README.md              # How to run this component
