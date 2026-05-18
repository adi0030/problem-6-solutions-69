# Deploy

Production deployment uses `docker-compose.prod.yml` and an `.env.prod`
file. Nginx terminates HTTP and proxies to the frontend / backend / static
uploads. For HTTPS in real production, put Caddy or a Certbot sidecar in front
(this skeleton only ships HTTP-on-80 to keep the example simple).

## Prerequisites on the server

- Docker Engine + Compose plugin (`docker compose version` works)
- A domain pointed at the server's IP (A record)
- A Google Cloud OAuth client (Web application) with:
  - Authorized redirect URI: `https://YOUR_DOMAIN/api/auth/callback/google`
  - (Dev) `http://localhost:3002/api/auth/callback/google`

## One-time setup

```bash
git clone <this repo>
cd problem-6-solutions-69
cp .env.example .env.prod
```

Edit `.env.prod` and set, at minimum:

```
POSTGRES_USER=social
POSTGRES_PASSWORD=<long random>
POSTGRES_DB=social
DATABASE_URL=postgresql://social:<long random>@postgres:5436/social
REDIS_URL=redis://redis:6380

FRONTEND_URL=https://YOUR_DOMAIN
BACKEND_URL=http://backend:4000
NEXTAUTH_URL=https://YOUR_DOMAIN

NEXTAUTH_SECRET=$(openssl rand -base64 32)
INTERNAL_API_TOKEN=$(openssl rand -hex 32)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

## Bring it up

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

The backend container runs `prisma migrate deploy` on start, so the schema is
applied automatically.

Visit `http://YOUR_DOMAIN/`. You should be redirected to login on first visit.

## TLS

The shipped `nginx/nginx.conf` only listens on port 80. For real production:

1. Mount certs into `/etc/nginx/certs` (e.g. via certbot)
2. Add a 443 `server { ... }` block reading `ssl_certificate`/`ssl_certificate_key`
3. Redirect 80 → 443

Or replace nginx with Caddy and let it auto-issue from Let's Encrypt.

## Backups

Postgres data is in the named volume `pg_data`. To take a nightly backup:

```bash
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" \
  | gzip > backup-$(date +%F).sql.gz
```

Wire that into a host cron job and copy the dumps somewhere durable (S3, etc.).

## Updating

```bash
git pull
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

## Health

- Backend: `GET /api/health` (proxied at `/api/health`)
- Frontend: `GET /healthz`
- Each service has a Docker `HEALTHCHECK` so `docker ps` shows status.

## Operational tips

- Logs: `docker compose logs -f backend frontend nginx`
- Shell into a container: `docker compose exec backend sh`
- Re-run migrations manually: `docker compose exec backend npx prisma migrate deploy`
- Wipe and start fresh (DESTRUCTIVE): `docker compose down -v`
