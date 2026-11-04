"""Gunicorn settings. Everything can be overridden with environment variables.

ONE worker process on purpose: SQLite has a single writer, and the background auto-refresh scheduler
(trending.start_scheduler) runs inside the worker. Concurrency comes from threads instead.
"""
import os

bind = f"0.0.0.0:{os.getenv('PORT', '8000')}"
workers = 1
worker_class = "gthread"
threads = int(os.getenv("GUNICORN_THREADS", "16"))
timeout = int(os.getenv("GUNICORN_TIMEOUT", "120"))        # AI answers and live source fan-out can take ~90 s
graceful_timeout = 30
keepalive = 5
accesslog = "-"
errorlog = "-"
loglevel = os.getenv("LOG_LEVEL", "info")
forwarded_allow_ips = "*"                                    # TLS ends at Coolify's proxy; ProxyFix handles the headers
