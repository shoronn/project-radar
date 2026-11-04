# Product Radar API — Flask + gunicorn, SQLite on a persistent volume at /data
# Build context: apps/api   (Coolify: Base Directory = /apps/api, Dockerfile Location = /Dockerfile)

FROM python:3.12-slim

# Optional build-time variable: shown at GET / and /healthz
ARG APP_VERSION=dev

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    APP_VERSION=${APP_VERSION} \
    DATA_DIR=/data \
    CONTENT_DIR=/app/content \
    PORT=8000

# curl: used by the Docker / Coolify health check. Fixed uid/gid 10001 for predictable volume ownership.
RUN apt-get update \
 && apt-get install -y --no-install-recommends curl \
 && rm -rf /var/lib/apt/lists/* \
 && groupadd --system --gid 10001 app \
 && useradd --system --uid 10001 --gid app --home-dir /app --shell /usr/sbin/nologin app

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
RUN chmod 755 /app/docker-entrypoint.sh \
 && mkdir -p /data && chown app:app /data

# A new Docker volume mounted at /data inherits this ownership, so the app never needs root.
USER app
VOLUME ["/data"]
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS "http://127.0.0.1:${PORT}/healthz" || exit 1

ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["gunicorn", "-c", "gunicorn.conf.py", "app:app"]
