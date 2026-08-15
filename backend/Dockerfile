FROM php:8.5-cli-bookworm

RUN apt-get update \
    && apt-get install -y --no-install-recommends git unzip libzip-dev libicu-dev libonig-dev \
    && docker-php-ext-install pdo_mysql mbstring intl zip \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

ARG INSTALL_DEV=false
COPY composer.json ./
RUN set -eux; \
    for attempt in 1 2 3; do \
      if [ "$INSTALL_DEV" = "true" ]; then \
        composer install --no-interaction --prefer-source --no-progress --optimize-autoloader && exit 0; \
      else \
        composer install --no-interaction --prefer-source --no-progress --no-dev --optimize-autoloader && exit 0; \
      fi; \
      echo "Composer install attempt $attempt failed; retrying..."; \
      sleep $((attempt * 5)); \
    done; \
    exit 1

COPY . .

RUN mkdir -p storage/framework/cache/data storage/framework/sessions storage/framework/views storage/logs bootstrap/cache \
    && chmod +x docker-entrypoint.sh \
    && chown -R www-data:www-data storage bootstrap/cache

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]
