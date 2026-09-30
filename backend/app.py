"""TravelDash — Traveler Registration CRUD API.

Minimal Flask application exposing a REST API under ``/api/travelers``.
"""

import os
from datetime import date, datetime

from dotenv import load_dotenv
from flask import Flask, jsonify, request, send_file
from flask_cors import CORS

# Load environment variables (.env)
load_dotenv()
backend_env = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
if os.path.exists(backend_env):
    load_dotenv(backend_env)
root_env = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
if os.path.exists(root_env):
    load_dotenv(root_env)

from database import db
from errors import ValidationError, register_error_handlers
from logging_config import setup_logging
from models import Traveler

# ---------------------------------------------------------------------------
# App factory-ish setup (kept in module scope for simplicity)
# ---------------------------------------------------------------------------
app = Flask(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "data.db")
app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{DB_PATH}"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

# Initialise extensions
db.init_app(app)
CORS(app)

# Logging & error handling
setup_logging(app)
register_error_handlers(app)

def _ensure_columns():
    """Ensure newly added columns exist in the SQLite database."""
    with db.engine.connect() as conn:
        existing = [row[1] for row in conn.exec_driver_sql("PRAGMA table_info(travelers)").fetchall()]
        cols_to_add = {
            "passport_photo": "TEXT",
            "passport_issue_date": "DATE",
            "gender": "VARCHAR(20)",
            "email": "VARCHAR(120)",
            "phone": "VARCHAR(50)",
            "address": "VARCHAR(255)",
            "city": "VARCHAR(100)",
            "postal_code": "VARCHAR(30)",
            "country": "VARCHAR(10)",
            "emergency_contact_name": "VARCHAR(150)",
            "emergency_contact_phone": "VARCHAR(50)",
            "emergency_contact_relation": "VARCHAR(50)",
        }
        for col_name, col_type in cols_to_add.items():
            if col_name not in existing:
                conn.exec_driver_sql(f"ALTER TABLE travelers ADD COLUMN {col_name} {col_type}")
        conn.commit()


# Create tables on first launch & run safe migration
with app.app_context():
    db.create_all()
    _ensure_columns()
    app.logger.info("TravelDash API started — database at %s", DB_PATH)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
DATE_FIELDS = {
    "date_of_birth",
    "passport_issue_date",
    "passport_expiry",
    "visa_expiry",
}
REQUIRED_FIELDS = {"full_name", "passport_number"}


def _parse_date(value: str | None, field_name: str) -> date | None:
    """Parse an ISO-8601 date string or return ``None``."""
    if not value:
        return None
    try:
        return date.fromisoformat(value)
    except (ValueError, TypeError):
        raise ValidationError(
            f"Invalid date format for '{field_name}': expected YYYY-MM-DD, got '{value}'"
        )


def _parse_body() -> dict:
    """Extract and validate the JSON request body."""
    data = request.get_json(silent=True)
    if data is None:
        raise ValidationError("Request body must be valid JSON.")
    return data


def _apply_fields(traveler: Traveler, data: dict) -> None:
    """Apply data-dict values onto a Traveler instance."""
    string_fields = [
        "full_name",
        "gender",
        "nationality",
        "passport_number",
        "passport_country",
        "passport_photo",
        "email",
        "phone",
        "address",
        "city",
        "postal_code",
        "country",
        "emergency_contact_name",
        "emergency_contact_phone",
        "emergency_contact_relation",
        "visa_type",
        "visa_number",
    ]
    for field in string_fields:
        if field in data:
            setattr(traveler, field, data[field])

    for field in DATE_FIELDS:
        if field in data:
            setattr(traveler, field, _parse_date(data[field], field))


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@app.get("/api/travelers")
def list_travelers():
    """Return all travelers."""
    travelers = Traveler.query.order_by(Traveler.id).all()
    return jsonify([t.to_dict() for t in travelers])


@app.get("/api/travelers/<int:traveler_id>")
def get_traveler(traveler_id: int):
    """Return a single traveler or 404."""
    traveler = db.session.get(Traveler, traveler_id)
    if traveler is None:
        from werkzeug.exceptions import NotFound

        raise NotFound(f"Traveler with id {traveler_id} not found.")
    return jsonify(traveler.to_dict())


@app.post("/api/travelers")
def create_traveler():
    """Create a new traveler record."""
    data = _parse_body()

    # Required-field validation
    for field in REQUIRED_FIELDS:
        if not data.get(field):
            raise ValidationError(f"'{field}' is required and cannot be empty.")

    traveler = Traveler()
    _apply_fields(traveler, data)

    db.session.add(traveler)
    try:
        db.session.commit()
    except Exception as exc:
        db.session.rollback()
        if "UNIQUE constraint" in str(exc):
            raise ValidationError(
                f"A traveler with passport number '{data.get('passport_number')}' already exists."
            )
        raise

    app.logger.info("Created traveler id=%s", traveler.id)
    return jsonify(traveler.to_dict()), 201


@app.put("/api/travelers/<int:traveler_id>")
def update_traveler(traveler_id: int):
    """Update an existing traveler."""
    traveler = db.session.get(Traveler, traveler_id)
    if traveler is None:
        from werkzeug.exceptions import NotFound

        raise NotFound(f"Traveler with id {traveler_id} not found.")

    data = _parse_body()
    _apply_fields(traveler, data)

    try:
        db.session.commit()
    except Exception as exc:
        db.session.rollback()
        if "UNIQUE constraint" in str(exc):
            raise ValidationError(
                f"A traveler with passport number '{data.get('passport_number')}' already exists."
            )
        raise

    app.logger.info("Updated traveler id=%s", traveler.id)
    return jsonify(traveler.to_dict())


@app.delete("/api/travelers/<int:traveler_id>")
def delete_traveler(traveler_id: int):
    """Delete a traveler."""
    traveler = db.session.get(Traveler, traveler_id)
    if traveler is None:
        from werkzeug.exceptions import NotFound

        raise NotFound(f"Traveler with id {traveler_id} not found.")

    db.session.delete(traveler)
    db.session.commit()
    app.logger.info("Deleted traveler id=%s", traveler_id)
    return "", 204


# ---------------------------------------------------------------------------
# Logs endpoint (for the frontend logs viewer)
# ---------------------------------------------------------------------------
@app.get("/api/logs")
def get_logs():
    """Return recent log entries from the log file.

    Query parameters:
        lines  — number of lines to return (default 200, max 1000)
        level  — optional severity filter (e.g. WARNING, ERROR)
    """
    from logging_config import LOG_FILE

    max_lines = min(int(request.args.get("lines", 200)), 1000)
    level_filter = request.args.get("level", "").upper()

    if not os.path.exists(LOG_FILE):
        return jsonify([])

    with open(LOG_FILE, "r", encoding="utf-8", errors="replace") as f:
        all_lines = f.readlines()

    # Take the last N lines and reverse so the latest logs appear first and on top
    tail = all_lines[-max_lines:][::-1]

    entries = []
    for raw in tail:
        line = raw.strip()
        if not line:
            continue

        # Parse the structured log format:
        # 2026-09-29T20:55:58+0200 | INFO     | <request-id> | <message>
        parts = line.split(" | ", 3)
        if len(parts) == 4:
            entry = {
                "timestamp": parts[0].strip(),
                "level": parts[1].strip(),
                "request_id": parts[2].strip(),
                "message": parts[3].strip(),
            }
        else:
            entry = {
                "timestamp": "",
                "level": "INFO",
                "request_id": "",
                "message": line,
            }

        if level_filter and entry["level"] != level_filter:
            continue

        entries.append(entry)

    return jsonify(entries)


@app.get("/api/logs/download")
def download_logs():
    """Download the raw log file as an attachment."""
    from logging_config import LOG_FILE

    if not os.path.exists(LOG_FILE):
        from werkzeug.exceptions import NotFound
        raise NotFound("Log file does not exist yet.")

    return send_file(
        LOG_FILE,
        as_attachment=True,
        download_name=f"traveldash-logs-{datetime.now().strftime('%Y%m%d_%H%M%S')}.log",
        mimetype="text/plain",
    )


# ---------------------------------------------------------------------------
# Passport Extraction & Profile Photo Cropping Endpoint (Gemini 2.5 Flash)
# ---------------------------------------------------------------------------
ALLOWED_PASSPORT_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".pdf"}
MAX_PASSPORT_FILE_SIZE = 20 * 1024 * 1024  # 20 MB


@app.post("/api/passport/extract")
def extract_passport():
    """Extract passport biographical details and face portrait using Gemini 2.5 Flash."""
    from passport_extractor import process_passport_file

    file_bytes = None
    filename = ""

    # 1. Multipart form file upload
    if "file" in request.files:
        uploaded_file = request.files["file"]
        filename = uploaded_file.filename or ""
        file_bytes = uploaded_file.read()
    elif "passport" in request.files:
        uploaded_file = request.files["passport"]
        filename = uploaded_file.filename or ""
        file_bytes = uploaded_file.read()
    else:
        # 2. JSON Base64 payload
        body = request.get_json(silent=True)
        if body and ("file" in body or "image" in body):
            raw_b64 = body.get("file") or body.get("image")
            if "," in raw_b64:
                raw_b64 = raw_b64.split(",", 1)[1]
            try:
                import base64
                file_bytes = base64.b64decode(raw_b64)
                filename = body.get("filename", "upload.jpg")
            except Exception:
                return jsonify({"success": False, "error": "Invalid base64 payload."}), 400

    if not file_bytes:
        return jsonify({
            "success": False,
            "error": "No passport file uploaded. Please upload a passport image (JPG, PNG, WebP) or PDF."
        }), 400

    # Validate file extension if filename is provided
    if filename:
        ext = os.path.splitext(filename)[1].lower()
        if ext and ext not in ALLOWED_PASSPORT_EXTENSIONS:
            return jsonify({
                "success": False,
                "error": f"Unsupported file type '{ext}'. Allowed formats: JPG, PNG, WEBP, PDF."
            }), 400

    # Validate file size limit
    if len(file_bytes) > MAX_PASSPORT_FILE_SIZE:
        size_mb = len(file_bytes) / (1024 * 1024)
        return jsonify({
            "success": False,
            "error": f"File size ({size_mb:.1f} MB) exceeds maximum allowed limit of 20 MB."
        }), 400

    try:
        data = process_passport_file(file_bytes, filename=filename)
        app.logger.info("Extracted passport data: doc=%s, name=%s %s",
                        data.get("documentNumber"), data.get("firstName"), data.get("lastName"))
        return jsonify({
            "success": True,
            "data": data,
        })
    except ValueError as val_err:
        app.logger.warning("Passport extraction validation error: %s", str(val_err))
        return jsonify({
            "success": False,
            "error": str(val_err),
        }), 400
    except RuntimeError as r_err:
        app.logger.error("Passport extraction runtime error: %s", str(r_err))
        return jsonify({
            "success": False,
            "error": str(r_err),
        }), 502
    except Exception as exc:
        app.logger.error("Unexpected error in passport extraction: %s", str(exc))
        return jsonify({
            "success": False,
            "error": f"Passport extraction failed: {str(exc)}",
        }), 500


# ---------------------------------------------------------------------------
# Entry-point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    app.run(debug=True, port=5000)

