#!/bin/sh
# Publica a rota do app no Caddy de borda (post-deploy de docker/komodo.sh).
set -eu

docker exec -i caddy sh -c "cat > /etc/caddy/conf.d/${STACK_NAME}.caddy" <<EOF
${PUBLIC_DOMAIN} {
	reverse_proxy ${STACK_NAME}_gateway:8080
}
EOF
docker exec caddy caddy validate --config /etc/caddy/caddyfile --adapter caddyfile >/dev/null
docker exec caddy caddy reload --config /etc/caddy/caddyfile --adapter caddyfile
