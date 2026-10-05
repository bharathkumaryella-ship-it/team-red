#!/bin/sh
set -eu

flask --app run:app db upgrade
exec gunicorn \
  --bind 0.0.0.0:5000 \
  --workers "${GUNICORN_WORKERS:-2}" \
  --timeout "${GUNICORN_TIMEOUT:-30}" \
  --access-logfile=- \
  --error-logfile=- \
  run:app
