FROM php:8.4-fpm-alpine

RUN apk add --no-cache libpq-dev nginx supervisor && \
    docker-php-ext-install pdo pdo_pgsql opcache

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/server

COPY . .

RUN composer install --no-dev --optimize-autoloader && \
    php artisan config:cache && \
    php artisan route:cache && \
    chown -R www-data:www-data /var/www/server/storage /var/www/server/bootstrap/cache

EXPOSE 9000
CMD ["php-fpm"]