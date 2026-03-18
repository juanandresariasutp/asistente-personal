FROM node:20-alpine

WORKDIR /app

# Instalar herramientas para compilar dependencias nativas (ej. better-sqlite3)
RUN apk add --no-cache python3 make g++

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar el código fuente
COPY . .

# Construir la aplicación (TypeScript a JS)
RUN npm run build

# Crear directorio de datos para SQLite
RUN mkdir -p /app/data

# Declarar el volumen (para Dokploy/Docker compose)
VOLUME [ "/app/data" ]

# Comando de inicio
CMD [ "npm", "start" ]
