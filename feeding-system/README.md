# Feeding System Backend (FastAPI)

This folder contains the **Feeding System backend** for the **AquaNext AI Shrimp Farm** project.
It is a **FastAPI-based microservice** responsible for handling all feeding-related operations such as:

* Feeding batch management
* AI-based feeding recommendations
* Motor control and feeder status
* Feeding analytics and monitoring

This service exposes REST APIs that are consumed by the **Feeding System Frontend (React/Vite)**.

---

# 1. Prerequisites

Make sure the following are installed on your machine:

* Python **3.10 or higher**
* `pip` (Python package manager)
* Git (optional but recommended)

---

# 2. Running the Backend Locally

### Step 1 — Navigate to the Feeding System Directory

From the root of the repository:

```
cd feeding-system
```

---

### Step 2 — Create a Virtual Environment

```
python -m venv venv
```

Activate it:

**Windows**

```
venv\Scripts\activate
```

**Linux / Mac**

```
source venv/bin/activate
```

---

### Step 3 — Install Dependencies

```
pip install -r requirements.txt
```

---

### Step 4 — Start the FastAPI Server

```
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

---

### API Documentation

After starting the server, open:

```
http://127.0.0.1:8000/docs
```

This will show the **Swagger API documentation** generated automatically by FastAPI.

---

# 3. Frontend Integration

The **Feeding System Frontend** is currently maintained in a separate project.

Example local path:

```
D:\Year4\PP1\shrimp_feeding_fastapi\frontend
```

The frontend expects the backend API at:

```
http://127.0.0.1:8000
```

### Running Frontend (Example)

Open a new terminal:

```
cd D:\Year4\PP1\shrimp_feeding_fastapi\frontend
npm install
npm run dev
```

---

# 4. Project Structure

```
feeding-system/
│
├── api/
│   └── server.py           # Optional script to run FastAPI server
│
├── app/                    # Main FastAPI application package
│   ├── main.py             # Application entry point
│   ├── core/               # Configuration and core settings
│   ├── database/           # Database connection and repositories
│   ├── routes/             # API route definitions
│   ├── schemas/            # Pydantic request/response models
│   ├── services/           # Business logic
│   ├── utils/              # Helper utilities
│   └── models/             # Data models
│
├── requirements.txt        # Python dependencies
└── README.md               # Documentation for this component
```

