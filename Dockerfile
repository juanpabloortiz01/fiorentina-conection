# Imagen ligera basada en Alpine Linux
FROM node:20-alpine

# Definir directorio de trabajo
WORKDIR /app

# Configurar entorno de producción
ENV NODE_ENV=production
ENV PORT=3000

# Copiar manifiesto de dependencias y código fuente
COPY package.json ./
COPY server.js ./
COPY public/ ./public/

# Cambiar al usuario no-root 'node' por seguridad
USER node

# Puerto expuesto para Easypanel
EXPOSE 3000

# Comando para iniciar la aplicación
CMD ["node", "server.js"]
