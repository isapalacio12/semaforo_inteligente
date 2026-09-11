# --- Etapa 1: compilar el frontend (React + Vite + Three.js) ---
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# --- Etapa 2: backend en produccion, sirviendo tambien el frontend ya compilado ---
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY backend/package*.json ./
RUN npm ci --omit=dev

COPY backend/ ./
COPY --from=frontend-build /app/frontend/dist ./public

EXPOSE 4000
CMD ["node", "src/server.js"]
