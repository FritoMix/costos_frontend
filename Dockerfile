# DATACONTROL - imagen del frontend
#
# Dos etapas:
#   1) "construccion": Node compila la app de Angular.
#   2) imagen final:   solo Nginx con los archivos ya compilados.
#
# La imagen final no lleva Node ni node_modules: pesa pocos MB y no expone
# herramientas de desarrollo en el servidor de la fabrica.

# --- Etapa 1: construir ----------------------------------------------------
FROM node:22-alpine AS construccion

WORKDIR /app

# Primero solo los manifiestos: mientras no cambien, Docker reutiliza la
# capa de dependencias y reconstruir tarda segundos.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# --- Etapa 2: servir -------------------------------------------------------
FROM nginx:1.27-alpine AS produccion

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=construccion /app/dist/frontend/browser /usr/share/nginx/html

EXPOSE 80

# 127.0.0.1 y no "localhost": dentro del contenedor "localhost" resuelve
# primero a IPv6 (::1) y Nginx solo escucha en IPv4, asi que la revision
# fallaria aunque el sitio este funcionando.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
    CMD wget -q --spider http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
