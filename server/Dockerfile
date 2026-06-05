FROM php:8.3-cli-alpine

# Install system dependencies
RUN apk add --no-cache \
    libpq-dev \
    libzip-dev \
    zip \
    unzip \
    git \
    curl \
    nodejs \
    npm

# Install PHP extensions
RUN docker-php-ext-install pdo pdo_pgsql zip

# Install Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# Set working directory
WORKDIR /var/www/html

# Expose Laravel default port
EXPOSE 8000

# Start command (install dependencies and serve)
CMD composer install && php artisan key:generate --ansi && php artisan serve --host=0.0.0.0 --port=8000
