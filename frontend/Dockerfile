FROM node:22-bookworm AS build

WORKDIR /app

COPY package*.json ./
RUN if [ -f package.json ]; then npm ci; fi

COPY . .
RUN if [ -f package.json ]; then npm run build -- --configuration production; fi

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
