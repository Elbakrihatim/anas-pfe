"""Logging configuration — rotating file handler with request-ID aware formatting."""

import logging
import os
import uuid
from logging.handlers import RotatingFileHandler

from flask import Flask, g, request

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
LOG_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "logs")
LOG_FILE = os.path.join(LOG_DIR, "traveldash.log")
MAX_BYTES = 5 * 1024 * 1024  # 5 MB per file
BACKUP_COUNT = 5
LOG_FORMAT = "%(asctime)s | %(levelname)-8s | %(request_id)s | %(message)s"
DATE_FORMAT = "%Y-%m-%dT%H:%M:%S%z"


# ---------------------------------------------------------------------------
# Custom filter that injects the request ID into every log record
# ---------------------------------------------------------------------------
class RequestIdFilter(logging.Filter):
    """Attach the current request ID (from Flask's ``g``) to every log record."""

    def filter(self, record):
        try:
            record.request_id = g.get("request_id", "no-request")
        except RuntimeError:
            # Outside of a request context (e.g. startup)
            record.request_id = "no-request"
        return True


# ---------------------------------------------------------------------------
# Public helper
# ---------------------------------------------------------------------------
def setup_logging(app: Flask) -> None:
    
    os.makedirs(LOG_DIR, exist_ok=True)

    level_name = os.environ.get("LOG_LEVEL", "INFO").upper()
    level = getattr(logging, level_name, logging.INFO)

    formatter = logging.Formatter(LOG_FORMAT, datefmt=DATE_FORMAT)

    file_handler = RotatingFileHandler(
        LOG_FILE, maxBytes=MAX_BYTES, backupCount=BACKUP_COUNT
    )
    file_handler.setLevel(level)
    file_handler.setFormatter(formatter)
    file_handler.addFilter(RequestIdFilter())

    # Attach to the root logger so *all* loggers propagate here.
    root = logging.getLogger()
    root.setLevel(level)
    root.addHandler(file_handler)

    # Also ensure Flask's own logger uses the same handler.
    app.logger.handlers.clear()
    app.logger.addHandler(file_handler)
    app.logger.setLevel(level)
    app.logger.propagate = False  # prevent duplicates through root logger

    # ---- per-request: assign a unique request ID ----
    @app.before_request
    def _assign_request_id():
        # Honour an incoming header (useful for tracing across services) or
        # generate a fresh UUID.
        g.request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))

    @app.before_request
    def _log_request_start():
        app.logger.info(
            ">>> %s %s (query=%s)",
            request.method,
            request.path,
            request.query_string.decode(),
        )

    @app.after_request
    def _log_request_end(response):
        app.logger.info(
            "<<< %s %s -> %s",
            request.method,
            request.path,
            response.status_code,
        )
        return response
