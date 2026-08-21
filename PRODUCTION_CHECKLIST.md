# Ludo Arena — Production Checklist

Use this checklist before every production deployment. All items must be `[x]` before going live.

---

## 🔐 Security

- [ ] `JWT_ACCESS_SECRET` is a random 64+ character string (not default)
- [ ] `JWT_REFRESH_SECRET` is a random 64+ character string (not default)
- [ ] `DATABASE_URL` uses a dedicated database user with minimal permissions (not `postgres` superuser)
- [ ] PostgreSQL is not publicly exposed (firewall rules applied)
- [ ] Redis is not publicly exposed and has a password set
- [ ] Nginx is configured for HTTPS (SSL certificate installed)
- [ ] CORS is restricted to production domain (not `*`)
- [ ] No `.env` files are committed to version control
- [ ] Swagger UI (`/v1/api/docs`) is disabled or protected in production
- [ ] `console.log` and `console.error` in application code do not leak sensitive data

---

## 🏗️ Infrastructure

- [ ] PostgreSQL 15+ is running and healthy
- [ ] Redis 7+ is running and healthy
- [ ] Backend health check returns `{ "status": "ok" }` at `GET /health`
- [ ] Nginx reverse proxy is configured for WebSocket upgrades
- [ ] Docker images are built without errors
- [ ] Container health checks are configured

---

## 🗃️ Database

- [ ] All Prisma migrations have been applied: `npx prisma migrate deploy`
- [ ] Prisma client has been generated: `npx prisma generate`
- [ ] An admin user account exists in the database
- [ ] Database backups are configured (automated daily backups)
- [ ] Database connection pooling is configured

---

## 🔨 Build

- [ ] Frontend builds without errors: `npm run build`
- [ ] Backend builds without errors: `cd backend && npm run build`
- [ ] Lint passes with 0 errors: `npm run lint`
- [ ] No TypeScript compilation errors in either project

---

## ⚙️ Configuration

- [ ] `VITE_SOCKET_URL` is set to the production backend URL
- [ ] All environment variables are set in the production `.env` file
- [ ] Port 3000 (backend) and port 80/443 (nginx) are accessible
- [ ] `NODE_ENV=production` is set for the backend

---

## 🎮 Feature Verification

- [ ] Player can register a new account
- [ ] Player can log in and session persists after refresh
- [ ] Player can submit a deposit request
- [ ] Admin can approve a deposit and wallet is credited
- [ ] Player can join a game queue
- [ ] Match is formed when two players join the same queue
- [ ] Game starts and dice/move events work
- [ ] Winner is correctly detected and settlement runs
- [ ] Player can submit a withdrawal request
- [ ] Admin can approve a withdrawal
- [ ] Referral code is generated for new users
- [ ] Referral bonus is credited when referred player plays

---

## 📊 Monitoring

- [ ] Application logs are being captured (Winston logger)
- [ ] Error alerting is configured (email/Slack/PagerDuty)
- [ ] Database disk usage monitoring is configured
- [ ] Uptime monitoring is configured for `/health` endpoint

---

## 🔄 Backup & Recovery

- [ ] Database backup procedure is documented (see `BACKUP_RECOVERY.md`)
- [ ] A test restore has been performed from backup
- [ ] Redis data persistence (RDB or AOF) is enabled

---

## 🚀 Deployment Sign-off

| Role | Name | Sign-off Date |
|---|---|---|
| Lead Developer | | |
| QA | | |
| Product Owner | | |
