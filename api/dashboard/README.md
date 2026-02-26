# How to Run the Dashboard

This dashboard requires a backend server that provides:
- `/dashboard/history` - API endpoint for historical data
- `/ws/sensors` - WebSocket endpoint for real-time sensor data
- `/dashboard/history.csv` - CSV export endpoint

## Option 1: Quick Test (Static File - Limited Functionality)

For a quick preview without backend data:

```powershell
# Navigate to the dashboard directory
cd "api/dashboard"

# Start a simple HTTP server (Python)
python -m http.server 8000

# Or using Node.js (if you have http-server installed)
npx http-server -p 8000
```

Then open: http://localhost:8000/index.html

**Note:** This will show the UI but won't have real data (WebSocket and API calls will fail).

## Option 2: Full Backend (Recommended)

Use the Python FastAPI server that provides all required endpoints:

### Step 1: Start the Backend API Server

```powershell
# Navigate to the water quality directory
cd "api/notebook/water quality"

# Install dependencies if needed
pip install fastapi uvicorn websockets python-multipart

# Start the FastAPI server
uvicorn predict_api:app --host 127.0.0.1 --port 8000 --reload
```

### Step 2: Serve the Dashboard HTML

In a new terminal:

```powershell
# Navigate to the dashboard directory
cd "api/dashboard"

# Start a simple HTTP server on port 3000
python -m http.server 3000
```

### Step 3: Access the Dashboard

1. Open your browser and go to: **http://localhost:3000/index.html**
2. The dashboard will try to connect to `http://localhost:3000/ws/sensors` and `http://localhost:3000/dashboard/history`
3. If the API is on port 8000, you'll need to either:
   - Modify the HTML file to use `http://localhost:8000` as the API URL, OR
   - Use a proxy server, OR
   - Copy the HTML file to be served by the FastAPI server

## Option 3: Use the Existing Node.js Server (Alternative)

The project includes a Node.js server in `api/notebook/water quality/dashboard/server.js`:

```powershell
# Navigate to the dashboard directory
cd "api/notebook/water quality/dashboard"

# Install dependencies
npm install

# Start the server
node server.js
```

Then open: http://localhost:3000/index.html

This server provides mock endpoints and will work with the dashboard.

## Option 4: Copy HTML to Backend Directory

The easiest way is to serve the HTML from the same server as the API:

1. Copy `api/dashboard/index.html` to `api/notebook/water quality/dashboard/index.html`
2. Start the Python FastAPI server:
   ```powershell
   cd "api/notebook/water quality"
   uvicorn predict_api:app --host 127.0.0.1 --port 8000 --reload
   ```
3. Access at: http://localhost:8000/dashboard/index.html

The FastAPI server should be configured to serve static files from the dashboard directory.



