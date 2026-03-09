# How to Run the Shrimp Farm AI Assistant

Follow these steps from the **project root** (this folder: `shrimp-farm-ai-assistant`).

---

## Prerequisites

- **Python 3.8+**
- **Node.js** (for the React dashboard)
- **OpenAI API key** (for the main orchestrator and AI agents)

---

## One-time setup

### 1. Open a terminal in the AI Assistant folder

```powershell
cd D:\Year4\PP1\AquaNext-AI-ShrimpFarm-25-26J-385\shrimp-farm-ai-assistant
```

### 2. Create and activate a virtual environment

```powershell
python -m venv venv
.\venv\Scripts\activate
```

### 3. Install Python dependencies

```powershell
pip install -r requirements.txt
pip install streamlit
```

*(Streamlit is used by `dashboard.py` but not listed in `requirements.txt`.)*

### 4. Set your OpenAI API key

Create a `.env` file in `shrimp-farm-ai-assistant` (or set the variable in the shell):

```powershell
# Option A: .env file (create .env with this line)
OPENAI_API_KEY=sk-your-key-here

# Option B: In PowerShell before running
$env:OPENAI_API_KEY = "sk-your-key-here"
```

### 5. Install React dashboard dependencies (for the web UI)

```powershell
cd web
npm install
cd ..
```

---

## What you can run

You can run **one or more** of the following. Use a **separate terminal** for each.

---

### Option A – Main orchestrator (AI agents + monitoring)

Runs the AI agents and a monitoring cycle. Needs `OPENAI_API_KEY`.

```powershell
cd D:\Year4\PP1\AquaNext-AI-ShrimpFarm-25-26J-385\shrimp-farm-ai-assistant
.\venv\Scripts\activate
python main.py
```

- Initializes all agents (water quality, feed, energy, labor, manager).
- Runs a monitoring cycle and prints farm status.
- Can start continuous monitoring (follow prompts in the terminal).

---

### Option B – Streamlit dashboard

Web UI with metrics, charts, and recommendations. **Does not require the API to be running.**

```powershell
cd D:\Year4\PP1\AquaNext-AI-ShrimpFarm-25-26J-385\shrimp-farm-ai-assistant
.\venv\Scripts\activate
streamlit run dashboard.py
```

- Opens in the browser (often `http://localhost:8501`).
- Shows real-time-style metrics, water quality, energy, labor, recommendations.

---

### Option C – React web dashboard + API (recommended for full dashboard)

This is the **React (Vite) dashboard** that talks to the **FastAPI backend**. Run both.

**Terminal 1 – API backend (port 8000):**

```powershell
cd D:\Year4\PP1\AquaNext-AI-ShrimpFarm-25-26J-385\shrimp-farm-ai-assistant
.\venv\Scripts\activate
.\venv\Scripts\python.exe -m uvicorn api.server:app --reload --port 8000
```

**Terminal 2 – React dev server (port 5173):**

```powershell
cd D:\Year4\PP1\AquaNext-AI-ShrimpFarm-25-26J-385\shrimp-farm-ai-assistant\web
npm run dev
```

- Open **http://localhost:5173** in the browser.
- The React app will call the API on port 8000 for dashboard data, history, etc.

---

## Quick reference

| What you want              | Command (from `shrimp-farm-ai-assistant`) |
|----------------------------|-------------------------------------------|
| AI orchestrator            | `.\venv\Scripts\activate` then `python main.py` |
| Streamlit dashboard        | `.\venv\Scripts\activate` then `streamlit run dashboard.py` |
| API only (for React)      | `.\venv\Scripts\python.exe -m uvicorn api.server:app --reload --port 8000` |
| React dashboard            | `cd web` then `npm run dev` → open http://localhost:5173 |

---

## Optional – run a single agent (Python)

From the same folder with `venv` activated:

```powershell
python -c "from agents.water_quality_agent import WaterQualityAgent; a = WaterQualityAgent(); print(a.simulate_water_quality_data(pond_id=1))"
```

---

## If something fails

- **“No module named …”**  
  Make sure you activated the venv (`.\venv\Scripts\activate`) and ran `pip install -r requirements.txt` and `pip install streamlit`.

- **OpenAI / API key errors when running `main.py`**  
  Set `OPENAI_API_KEY` in `.env` or in the shell.

- **React dashboard shows “Couldn’t load dashboard”**  
  Start the API in Terminal 1 (uvicorn on port 8000) and keep it running while using the React app.

- **Port already in use**  
  Either stop the other app using that port or change the port (e.g. `--port 8001` for uvicorn, or change Vite port in `web/vite.config.ts`).
