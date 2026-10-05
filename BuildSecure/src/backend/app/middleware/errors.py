"""Centralized JSON error responses."""

from __future__ import annotations

from flask import Flask, Response, jsonify
from werkzeug.exceptions import HTTPException


_HTTP_ERROR_MESSAGES = {
    400: ("BAD_REQUEST", "The request could not be processed."),
    401: ("UNAUTHORIZED", "Authentication is required."),
    403: ("FORBIDDEN", "The request is not permitted."),
    404: ("NOT_FOUND", "The requested resource was not found."),
    405: ("METHOD_NOT_ALLOWED", "The request method is not allowed."),
    413: ("REQUEST_TOO_LARGE", "The request exceeds the allowed size."),
    429: ("TOO_MANY_REQUESTS", "The request limit has been reached."),
}


def register_error_handlers(app: Flask) -> None:
    @app.errorhandler(HTTPException)
    def handle_http_exception(error: HTTPException) -> Response:
        status_code = error.code or 500
        code, message = _HTTP_ERROR_MESSAGES.get(
            status_code,
            ("HTTP_ERROR", "The request could not be processed."),
        )
        response = jsonify(error={"code": code, "message": message})
        response.status_code = status_code
        return response

    @app.errorhandler(Exception)
    def handle_unexpected_exception(error: Exception) -> Response:
        app.logger.error(
            "Unhandled application error; type=%s",
            type(error).__name__,
        )
        response = jsonify(
            error={
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected error occurred.",
            }
        )
        response.status_code = 500
        return response
