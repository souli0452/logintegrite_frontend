# ---- Build ----
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .

# "development" : environment.ts (API et Keycloak en localhost).
# "production"  : environment.prod.ts, regenere a partir des URLs publiques passees en build-args.
ARG NG_CONFIGURATION=development
ARG API_URL=https://api.logintegrite.asce-lc.bf/api/v1
ARG KEYCLOAK_URL=https://auth.logintegrite.asce-lc.bf
RUN if [ "$NG_CONFIGURATION" = "production" ]; then \
      printf "export const environment = {\n  production: true,\n  apiUrl: '%s',\n  keycloak: {\n    url: '%s',\n    realm: 'logintegrite',\n    clientId: 'logintegrite-backend'\n  }\n};\n" \
        "$API_URL" "$KEYCLOAK_URL" > src/environments/environment.prod.ts; \
    fi
RUN npx ng build --configuration ${NG_CONFIGURATION}

# ---- Run ----
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/*/browser /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=15s --timeout=3s --retries=5 CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
