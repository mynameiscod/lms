# LMS SaaS - Hetzner VPS Deployment Guide

> **Note**: GitHub Actions CI/CD automation is now enabled. Code pushed to `master` branch automatically builds, tests, and deploys to production VPS (187.124.97.56:5000).

## Prerequisites
- Hetzner VPS (€2.99/month minimum)
- Domain name (optional, for SSL)
- SSH client (PuTTY or terminal)

---

## STEP 1: Order Hetzner VPS

1. Go to **hetzner.com** → Cloud
2. Click "Create" → Cloud Server
3. Choose:
   - **Location**: Your nearest region
   - **OS**: Ubuntu 22.04
   - **Plan**: CPX11 (1 vCPU, 2GB RAM, 40GB SSD) - €2.99/month
   - **Storage**: 40GB (default)
   - **SSH Key**: Add your public key (or set root password)
4. Create server (takes ~1 min)
5. Note your **IP address** (shown in console)

---

## STEP 2: SSH Into Server

```bash
ssh root@YOUR_SERVER_IP
```

Or with private key:
```bash
ssh -i your-key.pem root@YOUR_SERVER_IP
```

---

## STEP 3: Install Dependencies

```bash
# Update system
apt-get update && apt-get upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Install Nginx
apt-get install -y nginx

# Install certbot (for SSL)
apt-get install -y certbot python3-certbot-nginx

# Install Git
apt-get install -y git
```

---

## STEP 4: Clone Your Repository

```bash
cd /opt
git clone https://github.com/mynameiscod/lms.git
cd lms
```

---

## STEP 5: Create Production Environment File

```bash
nano server/.env.production
```

Paste this (update with your values):
```env
NODE_ENV=production
PORT=5000
MONGO_URL=mongodb://localhost:27017/lms
MONGO_USER=lms_admin
MONGO_PASSWORD=YourSecurePasswordHere
JWT_SECRET=your_jwt_secret_key_min_32_chars_long_here
JWT_EXPIRY=7d
EMAIL_SERVICE=gmail
EMAIL_USER=infocodebegun@gmail.com
EMAIL_PASSWORD=uawxhzufpxlonlsl
FRONTEND_URL=http://YOUR_DOMAIN_OR_IP
REACT_APP_API_URL=http://YOUR_DOMAIN_OR_IP/api/v1
```

Save: `Ctrl+O` → `Enter` → `Ctrl+X`

---

## STEP 6: Build and Run with Docker

```bash
# Create environment file for docker-compose
cat > .env.docker << EOF
MONGO_USER=lms_admin
MONGO_PASSWORD=YourSecurePasswordHere
MONGO_URL=mongodb://lms_admin:YourSecurePasswordHere@mongodb:27017/lms
JWT_SECRET=your_jwt_secret_key_min_32_chars_long_here
EMAIL_USER=infocodebegun@gmail.com
EMAIL_PASSWORD=uawxhzufpxlonlsl
FRONTEND_URL=http://YOUR_DOMAIN_OR_IP
EOF

# Build and run
docker-compose -f docker-compose.prod.yml up -d

# Check status
docker-compose -f docker-compose.prod.yml logs -f
```

---

## STEP 7: Configure Nginx as Reverse Proxy

```bash
# Create Nginx config
nano /etc/nginx/sites-available/lms
```

Paste:
```nginx
server {
    listen 80;
    server_name YOUR_DOMAIN_OR_IP;

    # Proxy to backend
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Serve frontend
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
```

Enable config:
```bash
ln -s /etc/nginx/sites-available/lms /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default

# Test config
nginx -t

# Restart Nginx
systemctl restart nginx
```

---

## STEP 8: Set Up SSL (Free with Let's Encrypt)

```bash
certbot --nginx -d YOUR_DOMAIN -m your-email@example.com --agree-tos --non-interactive
```

This auto-renews! ✅

---

## STEP 9: Keep Services Running (Auto-restart)

```bash
# Enable Docker to start on boot
systemctl enable docker

# Restart containers on server reboot
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --restart-policy=always
```

---

## STEP 10: Verify Everything is Running

```bash
# Check Docker containers
docker ps

# Check Nginx
systemctl status nginx

# Test API
curl http://YOUR_DOMAIN_OR_IP/api/v1/health

# Check logs
docker-compose -f docker-compose.prod.yml logs backend
```

---

## Quick Reference - Commands

```bash
# View logs
docker-compose -f docker-compose.prod.yml logs -f backend

# Restart services
docker-compose -f docker-compose.prod.yml restart

# Stop services
docker-compose -f docker-compose.prod.yml down

# Update code (after git pull)
docker-compose -f docker-compose.prod.yml up -d --build
```

---

## Troubleshooting

**Port 5000 already in use?**
```bash
lsof -i :5000
kill -9 PID
```

**MongoDB connection failed?**
```bash
docker-compose -f docker-compose.prod.yml logs mongodb
```

**Nginx not proxying?**
```bash
systemctl restart nginx
curl -i http://localhost:5000
```

---

## After Deployment ✅

1. **Buy a domain** (Namecheap, GoDaddy ~$1-3/year)
2. **Point domain to your IP** (DNS A record: YOUR_IP)
3. **Access your LMS**: https://yourdomain.com
4. **Invite users**: Generate invite links from admin panel

---

## Monthly Costs
- Hetzner VPS: €2.99 (~$3)
- Domain: ~$1/month
- **Total: ~$4-5/month** ✨
