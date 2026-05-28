# Etapa 1: Construcción (Build)
FROM node:20-alpine AS build
WORKDIR /app

# Limpiar caché de npm
RUN npm cache clean --force

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias forzando la versión correcta
RUN npm install --force --legacy-peer-deps

# Forzar reinstalación de esbuild con versión compatible
RUN npm install esbuild@0.25.9 --save-dev --force

# Copiar código fuente
COPY . .

# Construir la aplicación (sin optimización para evitar errores)
RUN npm run build -- --configuration production

# Etapa 2: Servidor Nginx
FROM nginx:stable-alpine

# Copiar los archivos construidos
COPY --from=build /app/dist/NewFarmaProject/browser /usr/share/nginx/html

# Copiar configuración de nginx (si existe)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]