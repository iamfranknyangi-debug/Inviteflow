# InviteFlow — Deployment & Setup Guide

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 20+ | Backend runtime |
| PostgreSQL | 15+ | Primary database |
| Redis | 7+ | Caching, queues |
| Docker + Docker Compose | 24+ | Containerised deployment |
| npm | 9+ | Package management |

---

## 1. Local Development Setup

### Clone & install
```bash
git clone https://github.com/yourorg/inviteflow.git
cd inviteflow

# Install backend dependencies
cd backend && npm install && cd ..

# Install frontend dependencies
cd frontend && npm install && cd ..
```

### Configure environment
```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your values (see section 4)
```

### Create the database
```bash
# With psql:
createdb inviteflow
psql inviteflow < database/schema.sql

# Or with Docker:
docker run -d --name pg \
  -e POSTGRES_DB=inviteflow \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=secret \
  -p 5432:5432 postgres:15-alpine

docker exec -i pg psql -U postgres -d inviteflow < database/schema.sql
```

### Start Redis
```bash
docker run -d --name redis -p 6379:6379 redis:7-alpine
```

### Run in development mode
```bash
# Terminal 1 — Backend (hot reload)
cd backend && npm run dev

# Terminal 2 — Frontend (React dev server)
cd frontend && npm start
```

Frontend: http://localhost:3000  
API: http://localhost:5000  
Health check: http://localhost:5000/health

---

## 2. Production Deployment with Docker Compose

### Set production environment variables
```bash
cp backend/.env.example .env.prod
# Fill in all production values
```

Create `.env` in project root for Docker Compose:
```bash
DB_PASSWORD=strong_db_password_here
REDIS_PASSWORD=strong_redis_password
JWT_SECRET=64_character_random_string_here
QR_SECRET=another_64_character_random_string
APP_URL=https://inviteflow.app
FRONTEND_URL=https://inviteflow.app
AT_API_KEY=your_africas_talking_key
AT_USERNAME=your_at_username
TWILIO_ACCOUNT_SID=ACxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=+1234567890
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_REGION=af-south-1
AWS_S3_BUCKET=inviteflow-assets
```

### Deploy
```bash
# Build and start all containers
docker-compose up -d --build

# Check status
docker-compose ps

# View logs
docker-compose logs -f backend

# Run database migrations
docker-compose exec backend node src/utils/migrate.js
```

### SSL Certificates (Let's Encrypt)
```bash
# Install certbot
sudo apt install certbot

# Get certificate
sudo certbot certonly --standalone -d inviteflow.app -d www.inviteflow.app

# Copy certs
sudo cp /etc/letsencrypt/live/inviteflow.app/fullchain.pem deployment/ssl/
sudo cp /etc/letsencrypt/live/inviteflow.app/privkey.pem  deployment/ssl/

# Auto-renew (add to crontab)
0 3 * * * certbot renew --quiet && docker-compose restart frontend
```

---

## 3. Cloud Deployment Options

### Option A: Ubuntu VPS (DigitalOcean / Hetzner / Linode)
Recommended for East Africa — lowest latency to Tanzania.

```bash
# Server: Ubuntu 22.04, 2 CPU, 4GB RAM minimum
sudo apt update && sudo apt install -y docker.io docker-compose-v2 git
sudo systemctl enable docker

# Clone repo
git clone https://github.com/yourorg/inviteflow.git /opt/inviteflow
cd /opt/inviteflow

# Configure and start
cp backend/.env.example .env
nano .env   # fill values
docker-compose up -d --build
```

Estimated cost: ~$20-40/month (Hetzner CX21 or DO Basic)

### Option B: AWS (EC2 + RDS + S3)
- EC2 t3.small for backend ($15/month)
- RDS PostgreSQL db.t3.micro ($25/month)  
- S3 for file storage ($0.023/GB)
- CloudFront CDN for frontend (free tier)

### Option C: Railway / Render (No-server)
1. Push backend to GitHub
2. Connect Railway: `railway up` — auto-deploys from main branch
3. Add PostgreSQL and Redis plugins in Railway dashboard
4. Set all env vars in Railway UI

---

## 4. Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | Yes | `development` or `production` |
| `PORT` | No | API port (default 5000) |
| `DB_HOST` | Yes | PostgreSQL host |
| `DB_NAME` | Yes | Database name |
| `DB_USER` | Yes | DB username |
| `DB_PASSWORD` | Yes | DB password |
| `JWT_SECRET` | Yes | Min 32 chars, keep secret |
| `QR_SECRET` | Yes | Signs QR tokens, keep secret |
| `AT_API_KEY` | Yes* | Africa's Talking API key |
| `AT_USERNAME` | Yes* | Africa's Talking username |
| `TWILIO_ACCOUNT_SID` | No | Twilio fallback |
| `AWS_ACCESS_KEY_ID` | No | S3 storage |
| `AWS_S3_BUCKET` | No | S3 bucket name |

*Required for SMS sending. Without these, system runs in mock mode.

---

## 5. Africa's Talking SMS Configuration

```bash
# Sandbox (free, for testing)
AT_API_KEY=your_sandbox_key
AT_USERNAME=sandbox
AT_ENVIRONMENT=sandbox

# Production (real SMS)
AT_API_KEY=your_production_key
AT_USERNAME=your_app_name
AT_ENVIRONMENT=production
AT_SENDER_ID=InviteFlow   # Must be registered with AT
```

Supported countries: Tanzania, Kenya, Uganda, Rwanda, Nigeria, Ghana, and more.  
Pricing (Tanzania): approx TZS 100-150 per SMS  

### Register a Sender ID
1. Login to africastalking.com
2. Go to SMS > Sender IDs
3. Request "InviteFlow" (approval takes 1-3 business days)

---

## 6. WhatsApp via Twilio

### Sandbox (testing)
1. Twilio console → Messaging → WhatsApp Sandbox
2. Guests send "join [word]" to +14155238886
3. Set `TWILIO_WHATSAPP_FROM=whatsapp:+14155238886`

### Production
1. Apply for WhatsApp Business API at twilio.com
2. Submit business verification documents
3. Get a dedicated WhatsApp number
4. Update `TWILIO_WHATSAPP_FROM`

---

## 7. AWS S3 Setup

```bash
# Create S3 bucket
aws s3api create-bucket \
  --bucket inviteflow-assets \
  --region af-south-1 \
  --create-bucket-configuration LocationConstraint=af-south-1

# Enable public read for card images
aws s3api put-bucket-policy --bucket inviteflow-assets --policy '{
  "Version":"2012-10-17",
  "Statement":[{
    "Effect":"Allow",
    "Principal":"*",
    "Action":"s3:GetObject",
    "Resource":"arn:aws:s3:::inviteflow-assets/cards/*"
  }]
}'
```

---

## 8. Useful Commands

```bash
# View real-time API logs
docker-compose logs -f backend

# Access database shell
docker-compose exec db psql -U inviteflow_user -d inviteflow

# Run a specific SQL query
docker-compose exec db psql -U inviteflow_user -d inviteflow \
  -c "SELECT * FROM v_event_summary;"

# Restart backend only (after code change)
docker-compose restart backend

# Full rebuild
docker-compose down && docker-compose up -d --build

# Backup database
docker-compose exec db pg_dump -U inviteflow_user inviteflow > backup.sql

# Restore database
cat backup.sql | docker-compose exec -T db psql -U inviteflow_user inviteflow

# Generate a strong JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## 9. Monitoring & Maintenance

### Log locations (inside container)
- `logs/app.log` — general application logs
- `logs/error.log` — errors only

### Database maintenance
```sql
-- Check event summary
SELECT * FROM v_event_summary;

-- Check slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC LIMIT 10;

-- Cleanup old audit logs (>90 days)
DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '90 days';
```

### Health endpoints
- `GET /health` — API + DB status
- `GET /api/reports/dashboard` — business metrics

---

## 10. Security Checklist

- [ ] Change default admin password immediately
- [ ] Set strong random `JWT_SECRET` (min 64 chars)
- [ ] Set strong random `QR_SECRET` (min 64 chars)
- [ ] Enable HTTPS (SSL certificate)
- [ ] Restrict DB access to application server only
- [ ] Enable AWS S3 bucket logging
- [ ] Set up automated database backups
- [ ] Configure firewall: only ports 80, 443, 22 open
- [ ] Rotate API keys periodically
- [ ] Enable DB connection SSL (`DB_SSL=true`)
