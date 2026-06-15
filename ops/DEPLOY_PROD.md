# B10 — Deploy producción (intranet LAN)

## Requisitos

- Docker Engine 26+
- Docker Compose v2
- Archivos de secretos en `ops/secrets/`
- Certificados TLS internos opcionales en `ops/nginx/certs/`

## Estructura

- `docker-compose.prod.yml`: stack productivo
- `ops/nginx/default.prod.conf`: reverse proxy para frontend + backend
- `ops/env/.env.prod.example`: variables base
- `ops/secrets/db_password.txt`: secreto PostgreSQL
- `ops/secrets/redis_password.txt`: secreto Redis

## Levantar

```bash
cp ops/env/.env.prod.example .env
mkdir -p ops/secrets ops/nginx/certs ops/postgres/init
printf 'super-secret-db' > ops/secrets/db_password.txt
printf 'super-secret-redis' > ops/secrets/redis_password.txt
chmod 600 ops/secrets/*.txt

docker compose -f docker-compose.prod.yml --env-file .env up -d --build
```

## Servicios

- `nginx`: único punto de entrada LAN
- `frontend`: SPA React
- `backend`: API Hono + ingest + dashboards
- `postgres`: metadata persistente
- `redis`: cache + sesiones + dashboards rápidos
- `duckdb`: sidecar con volumen `/data` para consultas analíticas

## Notas de seguridad

- `jsh_backend_net` es interna, no expone postgres/redis/duckdb a la LAN.
- Se usan Docker secrets para passwords.
- `OFFLINE_MODE=true` y `DISABLE_TELEMETRY=true` fuerzan modo sin internet.
- `client_max_body_size 100m` limita uploads desde Nginx.
