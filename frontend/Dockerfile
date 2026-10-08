# Static files are the same on every platform: build them once natively, not under QEMU,
# where npm ci can hang for the arm64 image.
FROM --platform=$BUILDPLATFORM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

FROM nginx:1.31-alpine
# Hosts without compose DNS (Railway: api.railway.internal:8000) override the upstream.
ENV API_UPSTREAM=api:8000 NGINX_ENTRYPOINT_LOCAL_RESOLVERS=1
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 3000
