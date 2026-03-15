# Server Configuration - www.doc.al

## Server Info
- **Provider:** OVH
- **Server name:** ns3072021.ip-37-187-226.eu
- **Label:** www.doc.al
- **IPv4:** 37.187.226.220
- **IPv6:** 2001:41d0:303:16dc::1/128
- **Gateway:** 37.187.226.254
- **OS:** Ubuntu
- **Management:** Coolify (v4.0.0-beta.468)
- **Coolify URL:** http://37.187.226.220:8000

## Docker Containers

| Container | Image | Port | Network |
|-----------|-------|------|---------|
| docal-test (app) | w11xgq0xh5i3yii71hq75bsz:7118a79c049910b532376d1fa412de5f1c8cb67d | 0.0.0.0:3000->3000 | coolify |
| docal-db | postgres:18-alpine | 0.0.0.0:5432->5432 | bridge + coolify |
| coolify | ghcr.io/coollabsio/coolify:4.0.0-beta.468 | 0.0.0.0:8000->8080 | coolify |
| coolify-db | postgres:15-alpine | 5432 (internal) | coolify |
| coolify-redis | redis:7-alpine | 6379 (internal) | coolify |
| coolify-sentinel | ghcr.io/coollabsio/sentinel:0.0.19 | - | bridge |
| coolify-realtime | ghcr.io/coollabsio/coolify-realtime:1.0.11 | 0.0.0.0:6001-6002 | coolify |

## Database (PostgreSQL 18)

- **Container:** docal-db
- **User:** postgres
- **Password:** DocAl2026Secure!
- **Database:** docal
- **Internal URL:** postgresql://postgres:DocAl2026Secure!@docal-db:5432/docal?schema=public
- **External URL:** postgresql://postgres:DocAl2026Secure!@37.187.226.220:5432/docal?schema=public

## MinIO (S3-Compatible File Storage)

- **Container:** minio
- **Image:** minio/minio:latest
- **API Port:** 9000
- **Console Port:** 9001 (http://37.187.226.220:9001)
- **Root User:** docal-admin
- **Root Password:** MinIO2026Secure!
- **Bucket:** docal-documents
- **Network:** coolify
- **Volume:** minio-data

### File Structure in Bucket
```
docal-documents/
├── documents/{userId}/{timestamp}-{filename}.pdf    # User documents
├── kyc/{userId}/{prefix}_{randomId}.{ext}           # KYC verification files
```

## App Environment Variables

```env
DATABASE_URL=postgresql://postgres:DocAl2026Secure!@docal-db:5432/docal?schema=public
NEXTAUTH_URL=http://37.187.226.220:3000
AUTH_TRUST_HOST=true
NEXTAUTH_SECRET=super-secret-key-change-me-2026
CERTIFICATE_ENCRYPTION_KEY=change-this-to-a-random-32-chars
CRON_SECRET=cron-secret-2026
S3_ENDPOINT=http://minio:9000
S3_ACCESS_KEY=docal-admin
S3_SECRET_KEY=MinIO2026Secure!
S3_BUCKET=docal-documents
```

## Admin User (Platform Login)

- **Email:** admin@doc.al
- **Password:** Admin2026!
- **Role:** SUPER_ADMIN
- **Login URL:** http://37.187.226.220:3000/auth/login

## Docker Network Setup

The app and database must be on the same Docker network to communicate.
`docal-db` was connected to the `coolify` network manually:

```bash
sudo docker network connect coolify docal-db
```

**Note:** This connection may need to be re-applied after container restarts.

## Prisma Database Setup

Database schema was pushed using:

```bash
sudo docker exec -u root -e DATABASE_URL='postgresql://postgres:DocAl2026Secure!@docal-db:5432/docal?schema=public' <container-id> npx prisma db push
```

Dependencies installed inside container (needed for prisma):

```bash
sudo docker exec -u root <container-id> npm install dotenv prisma
```

## App Start Command (Manual)

```bash
sudo docker run -d --name docal-test \
  --network coolify \
  -p 3000:3000 \
  -e DATABASE_URL='postgresql://postgres:DocAl2026Secure!@docal-db:5432/docal?schema=public' \
  -e NEXTAUTH_URL='http://37.187.226.220:3000' \
  -e AUTH_TRUST_HOST='true' \
  -e NEXTAUTH_SECRET='super-secret-key-change-me-2026' \
  -e CERTIFICATE_ENCRYPTION_KEY='change-this-to-a-random-32-chars' \
  -e CRON_SECRET='cron-secret-2026' \
  w11xgq0xh5i3yii71hq75bsz:7118a79c049910b532376d1fa412de5f1c8cb67d
```

## Admin User Creation (SQL)

```sql
INSERT INTO "User" (id, email, name, password, role, "emailVerified", "kycStatus", "createdAt", "updatedAt")
VALUES ('admin001', 'admin@doc.al', 'Admin',
  '$2b$10$FgmM9LE3lxntVR6BrVEqcOWc6ORuuSnCtIwML7uIyyws4x.Z45Eli',
  'SUPER_ADMIN', NOW(), 'VERIFIED', NOW(), NOW());
```

## TODO (Pending Configuration)

- [ ] Configure domain DNS (www.doc.al -> 37.187.226.220)
- [ ] Setup SSL/HTTPS via Coolify (Let's Encrypt)
- [ ] Generate proper NEXTAUTH_SECRET (`openssl rand -base64 32`)
- [ ] Generate proper CERTIFICATE_ENCRYPTION_KEY (32 random chars)
- [ ] Configure RESEND_API_KEY for email sending
- [ ] Configure Cloudflare Turnstile (NEXT_PUBLIC_TURNSTILE_SITE_KEY, TURNSTILE_SECRET_KEY)
- [x] MinIO installed for S3-compatible document storage
- [ ] Configure Google OAuth (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET)
- [ ] Update Coolify app settings with correct env vars and port mapping
- [ ] Ensure docal-db network connection persists after restarts
- [ ] Change default admin password after first login
