# 🚀 Complete VPS Deployment Guide for LMS SaaS

## 🎯 What's Included

I've created a complete automated deployment solution for your LMS SaaS platform that handles everything from server setup to SSL certificates. Here's what you get:

### 📁 Deployment Files Created:
- **`deploy-to-vps.sh`** - One-command deployment script
- **`vps-config.env`** - Customizable configuration file
- **`vps-deploy.sh`** - Complete server setup script
- **`docker-compose.production.yml`** - Production Docker configuration
- **`nginx/`** - Optimized Nginx configuration with SSL
- **`scripts/`** - Database initialization and backup scripts
- **`TROUBLESHOOTING.md`** - Complete troubleshooting guide

## 🏃‍♂️ Quick Start (3 Commands!)

### Option 1: Super Quick Deployment
```bash
# 1. Edit your configuration
nano vps-config.env
# Update VPS_IP, DOMAIN_NAME, and EMAIL

# 2. Make script executable
chmod +x deploy-to-vps.sh

# 3. Deploy!
./deploy-to-vps.sh
```

### Option 2: Interactive Setup
```bash
chmod +x deploy-to-vps.sh
./deploy-to-vps.sh setup  # Configure interactively
./deploy-to-vps.sh deploy # Deploy with your settings
```

## 📋 Prerequisites

### Before You Start:
1. **🌐 VPS Requirements:**
   - Ubuntu 18.04+ or Debian 9+ 
   - 2GB+ RAM (4GB recommended)
   - 20GB+ disk space
   - Root or sudo access

2. **🔑 SSH Access:**
   - SSH key configured for passwordless login
   - Or SSH password access available

3. **📛 Domain Setup:**
   - Domain name pointing to your VPS IP address
   - DNS propagation completed (check with `nslookup your-domain.com`)

## ⚙️ Configuration

### 1. Edit `vps-config.env`:
```bash
# Required Settings
export VPS_IP="123.456.789.123"      # Your VPS IP address
export VPS_USER="root"               # SSH username
export DOMAIN_NAME="yourdomain.com"  # Your domain
export EMAIL="admin@yourdomain.com"  # Admin email for SSL
```

### 2. Optional Settings:
```bash
# Database
export DB_NAME="lms_saas_production"

# Security (auto-generated if not set)
export JWT_SECRET="your-secret-key"
export SESSION_SECRET="your-session-key"

# Email Service (optional)
export SMTP_HOST="smtp.gmail.com"
export SMTP_USER="your-email@gmail.com"
export SMTP_PASS="your-app-password"
```

## 🚀 Deployment Methods

### Method 1: Docker Compose (Recommended)
**Pros:** Easy scaling, isolated services, automatic backups
```bash
# This is the default method
./deploy-to-vps.sh
```

**What it deploys:**
- MongoDB with authentication
- Redis for session storage  
- Node.js backend with PM2
- Nginx reverse proxy with SSL
- Automatic backups
- Health monitoring

### Method 2: Direct Installation
**Pros:** Traditional setup, easier debugging
```bash
# Edit deploy-to-vps.sh and set DEPLOY_METHOD=2
./deploy-to-vps.sh
```

## 🛠️ What the Deployment Does

### 📦 System Setup:
1. Updates system packages
2. Installs Node.js 18, Docker, MongoDB, Nginx
3. Configures firewall (UFW)
4. Sets up SSL certificates with Let's Encrypt

### 🏗️ Application Setup:
1. Clones your repository
2. Builds React frontend and Node.js backend
3. Configures environment variables
4. Sets up database with proper indexes
5. Configures Nginx reverse proxy
6. Creates systemd services
7. Sets up PM2 process manager

### 🔐 Security Setup:
1. Generates secure passwords
2. Configures MongoDB authentication
3. Sets up SSL/HTTPS redirects
4. Implements rate limiting
5. Adds security headers

### 🔄 Automation Setup:
1. Daily database backups
2. Log rotation
3. SSL certificate auto-renewal
4. Service monitoring

## 📊 Post-Deployment

### ✅ Verify Deployment:
```bash
# Test website
curl -I https://yourdomain.com

# Test API
curl https://yourdomain.com/api/health

# Check SSL
curl -I https://yourdomain.com | grep -i "strict-transport"
```

### 🔑 Default Login:
- **URL:** `https://yourdomain.com`
- **Email:** `admin@lms-saas.com`
- **Password:** `admin123`
- **⚠️ IMPORTANT:** Change this password immediately!

### 📍 Important Files on VPS:
```
/var/www/lms-saas/          # Application directory
/etc/nginx/sites-available/ # Nginx configuration
/var/log/lms-saas/         # Application logs
/var/backups/lms-saas/     # Backup directory
```

## 🔧 Management Commands

### Service Management:
```bash
# SSH into your VPS
ssh your-user@your-vps-ip

# Docker Compose Method:
cd /var/www/lms-saas
docker-compose ps                    # Check status
docker-compose logs --tail=50       # View logs
docker-compose restart backend      # Restart service
docker-compose down && docker-compose up -d  # Full restart

# Direct Installation Method:
systemctl status lms-saas           # Check service
pm2 list                           # View PM2 processes
pm2 logs lms-saas                  # View logs
pm2 restart lms-saas               # Restart app
```

### Backup & Maintenance:
```bash
# Manual backup
/usr/local/bin/lms-saas-backup

# View backups
ls -la /var/backups/lms-saas/

# Update application
cd /var/www/lms-saas
git pull origin master
docker-compose up -d --build  # Docker method
# OR
npm run build && pm2 restart lms-saas  # Direct method
```

## 🚨 Troubleshooting

### Common Issues:

#### 🌐 "Site not loading"
```bash
# Check Nginx status
systemctl status nginx
nginx -t  # Test configuration

# Check DNS
nslookup yourdomain.com
```

#### 🔌 "API not working"
```bash
# Check backend service
docker-compose logs backend  # Docker method
pm2 logs lms-saas           # Direct method

# Test API directly
curl localhost:5000/api/health
```

#### 🗄️ "Database errors"
```bash
# Check MongoDB
docker-compose logs mongodb  # Docker method
systemctl status mongod    # Direct method

# Test connection
mongosh mongodb://localhost:27017/lms_saas
```

For detailed troubleshooting, see [TROUBLESHOOTING.md](TROUBLESHOOTING.md).

## 📈 Scaling & Performance

### Performance Optimization:
```bash
# Increase PM2 instances
docker-compose exec backend pm2 scale lms-saas max

# Monitor resources
htop
docker stats
```

### Load Balancing:
For high traffic, the Docker setup supports easy scaling:
```bash
# Scale specific services  
docker-compose up -d --scale backend=3
```

## 🔄 Updates & Maintenance

### Regular Updates:
```bash
# Weekly update routine
cd /var/www/lms-saas
git pull origin master
docker-compose pull
docker-compose up -d --build
```

### Security Updates:
```bash
# System updates
apt update && apt upgrade -y

# Certificate renewal (automatic, but can be manual)
certbot renew
systemctl reload nginx
```

## 📞 Support

### If Something Goes Wrong:

1. **Check the logs:**
   ```bash
   docker-compose logs --tail=100
   ```

2. **Run health check:**
   ```bash
   curl https://yourdomain.com/health
   ```

3. **Restart services:**
   ```bash
   docker-compose restart
   ```

4. **Full reset (if needed):**
   ```bash
   docker-compose down
   docker-compose up -d --build
   ```

### Getting Help:
When reporting issues, provide:
- Error messages from logs
- Output of `docker-compose ps`
- System resource usage (`htop`, `df -h`)

## 🎉 Success!

Once deployment completes successfully, you'll have:

✅ **Fully configured LMS SaaS platform**  
✅ **SSL/HTTPS security**  
✅ **Automated backups**  
✅ **Professional deployment**  
✅ **Monitoring & logging**  
✅ **Easy maintenance**  

Your LMS SaaS platform is now production-ready! 🚀

---

## 📝 Quick Reference

| Task | Command |
|------|---------|
| Deploy | `./deploy-to-vps.sh` |
| Check Status | `docker-compose ps` |
| View Logs | `docker-compose logs` |
| Restart | `docker-compose restart` |
| Backup | `/usr/local/bin/lms-saas-backup` |
| Update | `git pull && docker-compose up -d --build` |

**Default Login:** admin@lms-saas.com / admin123 (⚠️ Change immediately!)

Happy deploying! 🎯