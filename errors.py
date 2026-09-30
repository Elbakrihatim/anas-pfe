"""Centralised error handling — RFC 9457 Problem Details responses."""

import traceback

from flask import Flask, g, jsonify, request


# ---------------------------------------------------------------------------
# Custom exception for validation errors
# ---------------------------------------------------------------------------
class ValidationError(Exception):
    """Raised when client-supplied data fails validation."""

    def __init__(self, detail: str):
        super().__init__(detail)
        self.detail = detail


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------
def _problem(*, type_uri: str, title: str, status: int, detail: str) -> tuple:
    """Build an RFC 9457 Problem Details JSON response.

    The ``instance`` field is set to the current request path, and a custom
    ``requestId`` extension member carries the request ID for support
    reference.
    """
    body = {
        "type": type_uri,
        "title": title,
        "status": status,
        "detail": detail,
        "instance": request.path,
        "requestId": g.get("request_id", "unknown"),
    }
    response = jsonify(body)
    response.status_code = status
    response.content_type = "application/problem+json"
    return response


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------
def register_error_handlers(app: Flask) -> None:
    """Attach error handlers to the Flask application."""

    @app.errorhandler(ValidationError)
    def handle_validation(exc: ValidationError):
        app.logger.warning("Validation error: %s", exc.detail)
        return _problem(
            type_uri="about:blank",
            title="Validation Error",
            status=400,
            detail=exc.detail,
        )

    @app.errorhandler(404)
    def handle_not_found(exc):
        app.logger.warning("Not found: %s", request.path)
        return _problem(
            type_uri="about:blank",
            title="Not Found",
            status=404,
            detail=str(exc),
        )

    @app.errorhandler(Exception)
    def handle_generic(exc):
        # Log full traceback server-side
        app.logger.error(
            "Unhandled exception on %s %s:\n%s",
            request.method,
            request.path,
            traceback.format_exc(),
        )
        # Never leak internals to the client
        return _problem(
            type_uri="about:blank",
            title="Internal Server Error",
            status=500,
            detail="An unexpected error occurred. Reference: "
            + g.get("request_id", "unknown"),
        )
