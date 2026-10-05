FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    FLASK_ENV=production

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt \
    && groupadd --system --gid 10001 app \
    && useradd --system --uid 10001 --gid app --home-dir /app app \
    && install -d --owner=app --group=app --mode=0700 /app/instance/secure_attachments

COPY --chown=app:app app ./app
COPY --chown=app:app migrations ./migrations
COPY --chown=app:app alembic.ini ./alembic.ini
COPY --chown=app:app run.py .
COPY --chown=app:app entrypoint.sh .
RUN sed -i 's/\r$//' entrypoint.sh && chmod 0550 entrypoint.sh

USER app

EXPOSE 5000

CMD ["./entrypoint.sh"]
