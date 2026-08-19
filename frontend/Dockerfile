FROM node:22.22.3-bookworm AS build

WORKDIR /app

RUN npm install -g npm@12 --no-audit --no-fund

COPY package*.json ./
RUN npm install --no-audit --no-fund

COPY . .
RUN npm run build:prod

FROM nginx:1.29-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/auth-starter/browser /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1
