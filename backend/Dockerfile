FROM php:8.5-cli-bookworm

RUN apt-get update \
    && apt-get install -y --no-install-recommends git unzip libzip-dev libicu-dev libonig-dev \
    && docker-php-ext-install pdo_mysql mbstring intl zip \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

COPY composer.json composer.lock* ./
RUN if [ -f composer.json ]; then composer install --no-interaction --prefer-dist --no-progress; fi

COPY . .

EXPOSE 8000

CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]
