# --- Stage 1: Build Frontend ---
FROM node:20-slim AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# --- Stage 2: Backend & Final Image ---
FROM python:3.12-slim
LABEL "language"="python"
LABEL "framework"="fastapi"

WORKDIR /app

# Copy requirements and install
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code to /app/backend
COPY backend/ ./backend/

# Copy built frontend to /app/frontend/dist
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Environment variables
ENV PORT=8080
ENV DATABASE_PATH=/data/ledger.db
ENV PYTHONUNBUFFERED=1

# Create data directory for persistence
RUN mkdir -p /data

# Run application from backend directory
EXPOSE 8080
CMD ["sh", "-c", "cd /app/backend && uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080}"]
