# ============================================
# LMS SaaS - Production Deployment Guide
# For Handling 1M+ Users
# ============================================

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [VPS Requirements](#vps-requirements)
3. [Initial Setup](#initial-setup)
4. [Environment Variables](#environment-variables)
5. [Deployment Options](#deployment-options)
6. [Scaling Guide](#scaling-guide)
7. [Monitoring](#monitoring)
8. [Backup & Recovery](#backup--recovery)
9. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

```
                    ┌─────────────────────────────────────────────┐
                    │              INTERNET                       │
                    └─────────────────┬───────────────────────────┘
                                      │
                    ┌─────────────────▼───────────────────────────┐
                    │           NGINX Load Balancer               │
                    │        (SSL, Rate Limiting, Caching)        │
                    └─────────────────┬───────────────────────────┘
                                      │
         ┌────────────────────────────┼────────────────────────────┐
         │                            │                            │
         ▼                            ▼                            ▼
┌─────────────────┐        ┌─────────────────┐        ┌─────────────────┐
│   LMS Server 1  │        │   LMS Server 2  │        │   LMS Server 3  │
│   (Node.js)     │        │   (Node.js)     │        │   (Node.js)     │
└────────┬────────┘        └────────┬────────┘        └────────┬────────┘
         │                          │                          │
         └──────────────────────────┼──────────────────────────┘
                                    │
              ┌─────────────────────┼─────────────────────┐
              │                     │                     │
              ▼                     ▼                     ▼
    ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
    │    MongoDB      │   │     Redis       │   │   File Storage  │
    │  (Primary)      │   │  (Sessions/     │   │   (Uploads)     │
    │                 │   │   Cache)        │   │                 │
    └─────────────────┘   └─────────────────┘   └─────────────────┘
```

---

## VPS Requirements

### Minimum (10K users)
- **RAM**: 4GB
- **CPU**: 2 cores
- **Storage**: 40GB SSD
- **Bandwidth**: 1TB/month

### Recommended (100K users)
- **RAM**: 8GB
- **CPU**: 4 cores
- **Storage**: 100GB SSD
- **Bandwidth**: 5TB/month

### High Scale (1M+ users)
- **RAM**: 16-32GB
- **CPU**: 8+ cores
- **Storage**: 500GB+ SSD
- **Bandwidth**: Unlimited
- **Consider**: Multiple VPS with load balancer

### Hostinger Recommendations
| Plan | Users | Monthly Cost |
|------|-------|--------------|
| KVM 2 | 10K | ~$12/month |
| KVM 4 | 100K | ~$24/month |
| KVM 8 | 500K+ | ~$48/month |

---

## Initial Setup

### Step 1: VPS Initial Configuration
```bash
# SSH into your VPS
ssh root@your-vps-ip

# Download and run setup script
curl -fsSL https://raw.githubusercontent.com/your-repo/lms-saas/master/scripts/vps-initial-setup.sh | bash
```

### Step 2: Clone Repository
```bash
cd /root
git clone https://github.com/your-username/lms-saas.git lms
cd lms
```

### Step 3: Create Environment File (CRITICAL!)
```bash
# Copy example to actual .env
cp server/.env.example server/.env

# Edit with your values
nano server/.env
```

**⚠️ IMPORTANT**: The `.env` file is NEVER committed to Git. You must create it manually on each server.

---

## Environment Variables

### Required Variables
```env
# Server
PORT=5000
NODE_ENV=production

# MongoDB
MONGODB_URI=mongodb://admin:YOUR_STRONG_PASSWORD@mongodb:27017/lms-saas?authSource=admin

# JWT (generate with: openssl rand -hex 32)
JWT_SECRET=your-64-character-random-string

# Frontend
FRONTEND_URL=https://platform.codebegun.com
CLIENT_URL=https://platform.codebegun.com

# Email
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
```

### Generating Secure Values
```bash
# Generate JWT_SECRET
openssl rand -hex 32

# Generate MongoDB password
openssl rand -base64 24
```

---

## Deployment Options

### Option 1: Manual Deployment
```bash
cd /root/lms

# Pull latest code (preserves .env)
git stash
git pull origin master

# Rebuild and restart
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Check logs
docker-compose logs -f
```

### Option 2: Safe Deployment Script (Recommended)
```bash
# This script:
# - Creates backup before deploy
# - Preserves .env file
# - Has automatic rollback on failure
# - Runs health checks

cd /root/lms
./scripts/safe-deploy.sh
```

### Option 3: GitHub Actions Auto-Deploy
1. Add secrets to GitHub repository:
   - `VPS_HOST`: Your VPS IP
   - `VPS_USER`: root
   - `VPS_SSH_KEY`: Your SSH private key

2. Push to master branch - auto deploys!

3. Manual rollback:
   - Go to Actions → Safe Deploy
   - Click "Run workflow"
   - Select "rollback"

---

## Scaling Guide

### When to Scale

| Symptom | Solution |
|---------|----------|
| High CPU (>80%) | Add more server containers |
| High RAM (>85%) | Upgrade VPS or add Redis |
| Slow DB queries | Add MongoDB indexes |
| High latency | Enable Redis caching |

### Horizontal Scaling (Multiple Servers)
```bash
# Use scalable configuration
docker-compose -f docker-compose.scalable.yml up -d

# This starts:
# - 3 Node.js server instances
# - NGINX load balancer
# - Redis for sessions
# - MongoDB primary
```

### Adding More Server Instances
Edit `docker-compose.scalable.yml`:
```yaml
# Add server-4, server-5, etc.
```

Update `nginx.scalable.conf`:
```nginx
upstream lms_backend {
    server lms-server-1:5000;
    server lms-server-2:5000;
    server lms-server-3:5000;
    server lms-server-4:5000;  # Add new server
}
```

---

## Monitoring

### Quick Health Check
```bash
# Check all containers
docker ps

# Check server logs
docker logs lms-server --tail 100

# Check MongoDB
docker logs lms-mongodb --tail 50

# API health check
curl http://localhost:5000/api/health
```

### Resource Monitoring
```bash
# Real-time container stats
docker stats

# System resources
htop

# Disk usage
df -h

# Network connections
ss -tuln
```

### Log Files
```bash
# View live logs
docker-compose logs -f

# Server logs only
docker-compose logs -f server

# Export logs
docker-compose logs --no-color > logs.txt
```

---

## Backup & Recovery

### Automatic Backups
```bash
# Add to crontab
crontab -e

# Daily backup at 3 AM
0 3 * * * /root/lms/scripts/backup.sh >> /var/log/lms-backup.log 2>&1
```

### Manual Backup
```bash
# Backup MongoDB
docker exec lms-mongodb mongodump \
  --uri="mongodb://admin:password@localhost:27017" \
  --out=/data/backup/$(date +%Y%m%d)

# Copy to host
docker cp lms-mongodb:/data/backup ./backups/

# Backup uploads
tar -czvf uploads-backup-$(date +%Y%m%d).tar.gz /root/lms/uploads/
```

### Restore from Backup
```bash
# Restore MongoDB
docker exec lms-mongodb mongorestore \
  --uri="mongodb://admin:password@localhost:27017" \
  /data/backup/20240120/

# Restore uploads
tar -xzvf uploads-backup-20240120.tar.gz -C /
```

---

## Troubleshooting

### .env File Missing After Pull
```bash
# Check backup
ls -la /root/lms-backups/

# Restore from latest backup
cp /root/lms-backups/backup_*/. /root/lms/server/.env
```

### Container Won't Start
```bash
# Check logs
docker logs lms-server

# Rebuild without cache
docker-compose build --no-cache
docker-compose up -d
```

### MongoDB Connection Error
```bash
# Check MongoDB is running
docker ps | grep mongo

# Check MongoDB logs
docker logs lms-mongodb

# Test connection
docker exec -it lms-mongodb mongosh -u admin -p
```

### 502 Bad Gateway
```bash
# Restart all services
docker-compose restart

# Check NGINX config
docker exec lms-nginx nginx -t
```

### Out of Memory
```bash
# Add swap
fallocate -l 4G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile

# Clear Docker cache
docker system prune -a
```

---

## Security Checklist

- [ ] Change default MongoDB password
- [ ] Generate strong JWT_SECRET
- [ ] Enable firewall (ufw)
- [ ] Setup SSL certificate
- [ ] Disable root SSH (optional)
- [ ] Setup fail2ban
- [ ] Regular security updates
- [ ] Backup encryption

---

## Quick Commands Reference

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# Restart specific service
docker-compose restart server

# View logs
docker-compose logs -f

# Safe deploy
./scripts/safe-deploy.sh

# Check health
curl http://localhost:5000/api/health

# Backup database
docker exec lms-mongodb mongodump --out /data/backup

# SSH into container
docker exec -it lms-server sh
```

---

## Support

For issues, check:
1. Container logs: `docker-compose logs`
2. Health endpoint: `curl localhost:5000/api/health`
3. System resources: `htop` and `docker stats`

Emergency rollback:
```bash
cd /root/lms
git reset --hard HEAD~1
docker-compose build
docker-compose up -d
```
