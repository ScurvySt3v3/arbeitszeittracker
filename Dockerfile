# Build stage
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Production stage with PHP support
FROM php:8.1-fpm-alpine

# Install nginx and SQLite
RUN apk add --no-cache nginx sqlite

# Enable SQLite extension
RUN docker-php-ext-install pdo pdo_sqlite

# Copy built frontend
COPY --from=build /app/build /var/www/html

# Copy PHP backend
COPY api/ /var/www/html/api/

# Copy nginx configuration
COPY nginx.conf /etc/nginx/http.d/default.conf

# Create database directory with proper permissions
RUN mkdir -p /var/www/html/api/db && \
    chown -R www-data:www-data /var/www/html && \
    chmod -R 755 /var/www/html && \
    chmod -R 777 /var/www/html/api/db

# Initialize database
RUN cd /var/www/html/api && php init_db.php

# Start script
COPY start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 80
CMD ["/start.sh"]