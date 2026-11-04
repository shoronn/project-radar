#!/bin/sh
# Runs at container start (official nginx entrypoint executes /docker-entrypoint.d/*.sh before nginx).
#  1. validates API_URL
#  2. writes /usr/share/nginx/html/config.js  -> window.PR_CONFIG.apiUrl used by the SPA
#  3. renders the nginx config (CSP connect-src gets the API origin)
# One image therefore works for any API domain: change API_URL and restart, no rebuild.
set -eu

HTML_DIR="${HTML_DIR:-/usr/share/nginx/html}"
TEMPLATE="${NGINX_TEMPLATE:-/etc/nginx/product-radar/default.conf.template}"
OUT_CONF="${NGINX_OUT_CONF:-/etc/nginx/conf.d/default.conf}"

: "${API_URL:?API_URL is required, e.g. https://api-pradar.maktechgroup.com}"

case "$API_URL" in
  http://*|https://*) ;;
  *) echo "[product-radar] ERROR: API_URL must start with http:// or https:// (got: $API_URL)" >&2; exit 1 ;;
esac
case "$API_URL" in
  *\"*|*\\*|*\'*|*\<*|*\>*|*" "*|*\;*) echo "[product-radar] ERROR: API_URL contains invalid characters" >&2; exit 1 ;;
esac
case "${CSP_EXTRA_CONNECT_SRC:-}" in
  *\"*|*\\*|*\;*) echo "[product-radar] ERROR: CSP_EXTRA_CONNECT_SRC contains invalid characters" >&2; exit 1 ;;
esac

API_URL_CLEAN=$(printf '%s' "$API_URL" | sed 's:/*$::')
# scheme://host[:port] only, for the CSP connect-src directive
API_ORIGIN=$(printf '%s' "$API_URL_CLEAN" | sed -E 's#^(https?://[^/]+).*#\1#')
export API_ORIGIN CSP_EXTRA_CONNECT_SRC="${CSP_EXTRA_CONNECT_SRC:-}"

cat > "$HTML_DIR/config.js" <<EOF
/* generated at container start - do not edit */
window.PR_CONFIG = Object.freeze({ apiUrl: "${API_URL_CLEAN}", version: "${APP_VERSION:-dev}" });
EOF

envsubst '${API_ORIGIN} ${CSP_EXTRA_CONNECT_SRC}' < "$TEMPLATE" > "$OUT_CONF"

echo "[product-radar] config.js + nginx config written (API_URL=${API_URL_CLEAN}, CSP connect-src ${API_ORIGIN} ${CSP_EXTRA_CONNECT_SRC})"
