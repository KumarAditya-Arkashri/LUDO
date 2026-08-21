# Ludo Arena — Deployment Guide

## Prerequisites

| Tool | Minimum Version |
|---|---|
| Node.js | 18.x LTS |
| PostgreSQL | 15.x |
| Redis | 7.x |
| Docker | 24.x |
| Docker Compose | v2.x |

---

## Environment Variables

### Backend (`backend/.env`)

```env
# Database
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/ludo_arena?schema=public"

# JWT
JWT_ACCESS_SECRET="<min 64-char random secret>"
JWT_REFRESH_SECRET="<min 64-char random secret>"

# Server
PORT=3000

# Redis (add when using Redis module)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

> **IMPORTANT**: Change all default secrets before deploying to production.  
> Generate secure secrets with: `openssl rand -base64 64`

---

## Local Development

### 1. Start infrastructure
```bash
cd backend
docker-compose up -d  # starts Postgres on port 5432
```

### 2. Install dependencies
```bash
# Frontend
npm install

# Backend
cd backend && npm install
```

### 3. Initialize database
```bash
cd backend
npx prisma migrate dev --name init
npx prisma generate
```

### 4. Start backend
```bash
cd backend
npm run start:dev
```

### 5. Start frontend
```bash
# In project root
npm run dev
```

Frontend is at `http://localhost:4000` and proxies `/api` and `/socket.io` to `http://localhost:3000`.

---

## Production Deployment

### Docker (recommended)

#### Full stack docker-compose

Create `docker-compose.prod.yml` in the project root:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ludo_arena
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    restart: unless-stopped

  backend:
    build: ./backend
    env_file: ./backend/.env.production
    ports:
      - "3000:3000"
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - backend
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

#### Run
```bash
docker-compose -f docker-compose.prod.yml up -d
```

---

### Manual Deployment

#### Build backend
```bash
cd backend
npm ci
npx prisma generate
npx prisma migrate deploy
npm run build
```

#### Build frontend
```bash
npm ci
npm run build
```

#### Start
```bash
# Backend
cd backend && node dist/main.js

# Frontend (serve from .output/server)
node .output/server/index.mjs
```

---

## Nginx Configuration (SSL + WebSocket)

```nginx
server {
    listen 80;
    server_name api.ludoarena.app;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.ludoarena.app;

    ssl_certificate     /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## Database Migrations

```bash
# Run pending migrations
npx prisma migrate deploy

# Check migration status
npx prisma migrate status

# Reset (DANGER: destroys all data)
npx prisma migrate reset
```

---

## Health Check Endpoint

```
GET /health
```

Returns:
```json
{ "status": "ok", "info": { "database": { "status": "up" } } }
```

Configure your load balancer or orchestrator to poll this endpoint every 15 seconds.

---

## Scaling Considerations

| Concern | Solution |
|---|---|
| Multiple backend instances | Ensure `REDIS_HOST` is shared across all instances for socket room state |
| Database connections | Set `DATABASE_URL` connection pool: `?connection_limit=10` |
| WebSocket sticky sessions | Required when load balancing Socket.IO with multiple nodes — use Redis adapter |
| Frontend CDN | Build with `npm run build` and serve `.output/public` from a CDN |
