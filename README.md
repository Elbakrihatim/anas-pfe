# TravelDash

Traveler registration application for traveling Agencies.

## Architecture

```
TravelDash/
├── backend/
│   ├── app.py              # Flask application & REST endpoints
│   ├── models.py           # SQLAlchemy Traveler model
│   ├── database.py         # SQLAlchemy instance
│   ├── logging_config.py   # RotatingFileHandler + request-ID logging
│   ├── errors.py           # Centralised error handling (RFC 9457)
│   ├── requirements.txt    # Python dependencies
│   └── logs/               # Auto-created log files (gitignored)
│
├── frontend/               # Vite + React (plain CSS, functional components)
│   ├── src/
│   │   ├── App.jsx          # Root component — CRUD orchestration
│   │   ├── TravelerForm.jsx # Create / edit form
│   │   ├── TravelerTable.jsx# Traveler list table
│   │   ├── api.js           # Fetch wrapper for the Flask API
│   │   └── App.css          # All styles
│   └── ...
│
└── README.md               # ← you are here
```

| Layer    | Tech                                  |
| -------- | ------------------------------------- |
| Backend  | Python · Flask · SQLAlchemy · SQLite  |
| Frontend | React (Vite) · plain CSS              |
| Database | SQLite (`backend/data.db`)            |

The Flask API runs on **port 5000**; the Vite dev server runs on **port 5173** by default. CORS is enabled on the Flask side so the frontend can call the API cross-origin during development.

## Setup

### Prerequisites

- **Python 3.10+** (a `.venv` virtual environment is recommended)
- **Node.js 18+** and **npm**

### Backend

```bash
# From the repo root
cd backend

# Create & activate a virtual environment (if you haven't already)
python -m venv ../.venv
# Windows:
..\.venv\Scripts\activate
# macOS / Linux:
source ../.venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the API server
python app.py
```

The API will start at `http://localhost:5000`.

### Frontend

```bash
# From the repo root
cd frontend

# Install dependencies
npm install

# Start the dev server
npm run dev
```

The app will open at `http://localhost:5173`.

## API Reference

All endpoints live under `/api/travelers`.

| Method   | Path                      | Description              |
| -------- | ------------------------- | ------------------------ |
| `GET`    | `/api/travelers`          | List all travelers       |
| `GET`    | `/api/travelers/<id>`     | Get a single traveler    |
| `POST`   | `/api/travelers`          | Create a new traveler    |
| `PUT`    | `/api/travelers/<id>`     | Update an existing one   |
| `DELETE` | `/api/travelers/<id>`     | Delete a traveler        |

**Error responses** follow the [RFC 9457 Problem Details](https://www.rfc-editor.org/rfc/rfc9457) format and include a `requestId` for cross-referencing with server logs.

## Logging

- Logs are written to `backend/logs/traveldash.log` using a `RotatingFileHandler` (5 MB max, 5 backups).
- Every log line includes: **timestamp**, **severity**, **request ID**, and **message**.
- Log level is configurable via the `LOG_LEVEL` environment variable (default: `INFO`).

```bash
# Example: run with debug logging
LOG_LEVEL=DEBUG python app.py
```

## Environment Variables

| Variable    | Default | Description                        |
| ----------- | ------- | ---------------------------------- |
| `LOG_LEVEL` | `INFO`  | Python log level (DEBUG, INFO, …) |
