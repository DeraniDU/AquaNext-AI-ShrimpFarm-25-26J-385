# How to Run the Dashboard

This React dashboard requires a backend API server running on port 5000.

## Quick Start

### Step 1: Install React Dependencies

```powershell
cd backend\dashboard
npm install
```

### Step 2: Start the Backend API (Required)

The React app fetches data from `http://localhost:5000/api/dashboard`. You need to start the Flask backend:

```powershell
# From the backend directory
cd ..
python app.py
```

**Note:** The backend requires `models.pkl` file. If it's missing, the backend will still run but models won't be loaded. The API endpoint will still return mock data.

### Step 3: Start the React Development Server

In a new terminal:

```powershell
cd backend\dashboard
npm start
```

This will:
- Start the development server (usually on http://localhost:3000)
- Automatically open your browser
- Hot-reload when you make changes

## Troubleshooting

### If the backend is not running:
- The React app will show "Connecting to AQUANEXT Gateway..." message
- Make sure `backend/app.py` is running on port 5000
- Check the browser console for connection errors

### If you get npm errors:
```powershell
# Clear npm cache and reinstall
npm cache clean --force
npm install
```

### If port 3000 is already in use:
React will prompt you to use a different port. Press 'Y' to accept.

## Alternative: Run Backend with Python

If you prefer to install Python dependencies first:

```powershell
cd backend
pip install -r requirements.txt
python app.py
```

---

**Both servers need to run simultaneously:**
- Backend (Flask): `http://localhost:5000`
- Frontend (React): `http://localhost:3000`


