# ──────────────────────────────────────────────────────────────────
# Stage 1 — Composer dependencies
# ──────────────────────────────────────────────────────────────────
FROM php:8.3-cli-alpine AS composer-deps

RUN apk add --no-cache \
    git curl unzip libzip-dev libpq-dev oniguruma-dev libxml2-dev \
    && docker-php-ext-install pdo pdo_pgsql zip bcmath pcntl ffi

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /app
COPY composer.json composer.lock* ./
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist

COPY . .
RUN composer dump-autoload --optimize --no-dev

# ──────────────────────────────────────────────────────────────────
# Stage 2 — DuckDB binary download
# ──────────────────────────────────────────────────────────────────
FROM alpine:3.19 AS duckdb-download
RUN apk add --no-cache curl
# DuckDB v1.1.3 CLI (Linux x86_64)
RUN curl -fsSL "https://github.com/duckdb/duckdb/releases/download/v1.1.3/duckdb_cli-linux-amd64.zip" \
    -o /tmp/duckdb.zip \
    && unzip /tmp/duckdb.zip -d /tmp \
    && chmod +x /tmp/duckdb

# ──────────────────────────────────────────────────────────────────
# Stage 3 — Production image
# ──────────────────────────────────────────────────────────────────
FROM php:8.3-fpm-alpine AS production

RUN apk add --no-cache \
    nginx supervisor curl \
    libzip libpq oniguruma libxml2 \
    && docker-php-ext-install pdo pdo_pgsql zip bcmath pcntl ffi opcache

# PHP config
RUN echo 'opcache.enable=1' >> /usr/local/etc/php/conf.d/opcache.ini \
    && echo 'opcache.jit=tracing' >> /usr/local/etc/php/conf.d/opcache.ini \
    && echo 'opcache.jit_buffer_size=256M' >> /usr/local/etc/php/conf.d/opcache.ini \
    && echo 'ffi.enable=1' >> /usr/local/etc/php/conf.d/ffi.ini

# DuckDB CLI
COPY --from=duckdb-download /tmp/duckdb /usr/local/bin/duckdb

# Application
WORKDIR /var/www/html
COPY --from=composer-deps /app .

# Permissions
RUN chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache \
    && chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache

# Entrypoint
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 8000
CMD ["/entrypoint.sh"]
