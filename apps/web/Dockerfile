# Product Radar web — vanilla JS SPA served by nginx
# Build context: apps/web   (Coolify: Base Directory = /apps/web, Dockerfile Location = /Dockerfile)

FROM nginx:1.27-alpine

# Optional build-time variable: stamped into asset URLs (?v=...) for cache busting
ARG APP_VERSION=dev

# API_URL is RUNTIME: config.js and the CSP are generated at container start
# by /docker-entrypoint.d/40-product-radar-config.sh. Override it in Coolify.
ENV APP_VERSION=${APP_VERSION} \
    API_URL=http://localhost:8000 \
    CSP_EXTRA_CONNECT_SRC="" \
    NGINX_ENVSUBST_TEMPLATE_DIR=/nonexistent

# curl: used by the Docker / Coolify health check
RUN apk add --no-cache curl \
 && rm -f /etc/nginx/conf.d/default.conf \
 && mkdir -p /etc/nginx/product-radar

COPY nginx/default.conf.template /etc/nginx/product-radar/default.conf.template
COPY docker-entrypoint.d/40-product-radar-config.sh /docker-entrypoint.d/40-product-radar-config.sh
COPY public/ /usr/share/nginx/html/

RUN chmod +x /docker-entrypoint.d/40-product-radar-config.sh \
 && sed -i "s/__APP_VERSION__/${APP_VERSION}/g" /usr/share/nginx/html/index.html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -fsS http://127.0.0.1/healthz || exit 1
