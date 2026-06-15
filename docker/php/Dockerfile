FROM php:8.3-fpm-alpine

# Install system dependencies
RUN apk add --no-cache \
    git curl unzip libzip-dev libpng-dev libjpeg-turbo-dev \
    freetype-dev oniguruma-dev libxml2-dev postgresql-dev \
    linux-headers autoconf g++ make

# PHP extensions
RUN docker-php-ext-install \
    pdo_pgsql pgsql \
    mbstring \
    zip \
    bcmath \
    pcntl \
    exif

# Enable FFI for DuckDB
RUN docker-php-ext-enable ffi
RUN echo "ffi.enable=true" >> /usr/local/etc/php/conf.d/ffi.ini

# Redis extension
RUN pecl install redis && docker-php-ext-enable redis

# Composer
COPY --from=composer:2.7 /usr/bin/composer /usr/bin/composer

# DuckDB CLI
RUN curl -L https://github.com/duckdb/duckdb/releases/download/v1.1.3/duckdb_cli-linux-amd64.zip -o /tmp/duckdb.zip \
    && unzip /tmp/duckdb.zip -d /usr/local/bin/ \
    && chmod +x /usr/local/bin/duckdb \
    && rm /tmp/duckdb.zip

WORKDIR /var/www/html

# PHP config
COPY php.ini /usr/local/etc/php/conf.d/jsh-dashboard.ini

RUN addgroup -g 1000 appgroup && adduser -u 1000 -G appgroup -D appuser
USER appuser

EXPOSE 9000
CMD ["php-fpm"]
