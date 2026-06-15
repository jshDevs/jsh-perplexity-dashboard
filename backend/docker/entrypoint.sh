#!/bin/sh
set -e

# Wait for dependent services
echo "[entrypoint] Waiting for PostgreSQL..."
until php artisan migrate --force 2>/dev/null; do
  echo "[entrypoint] Waiting for DB... retrying in 3s"
  sleep 3
done

# Create storage directories
mkdir -p storage/dashboards storage/metrics storage/data
chmod -R 775 storage bootstrap/cache

# Cache config and routes for production
if [ "$APP_ENV" = "production" ]; then
  php artisan config:cache
  php artisan route:cache
  php artisan event:cache
fi

# Seed on first run if no dashboards exist
if [ ! -f storage/dashboards/ventas.yaml ]; then
  php artisan db:seed --force
fi

echo "[entrypoint] Starting PHP-FPM and artisan serve..."
exec php artisan serve --host=0.0.0.0 --port=8000
