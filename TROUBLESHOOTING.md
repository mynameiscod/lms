# 🚨 VPS Deployment Troubleshooting Guide

## Quick Diagnostics

### 1. Check All Services Status
```bash
# SSH into your VPS
ssh your-user@your-vps-ip

# Check Docker containers
cd /var/www/lms-saas
docker-compose ps

# Check service logs
docker-compose logs --tail=50
```

### 2. Common Issues & Solutions

#### ❌ Problem: "Connection refused" or 500 errors

**Possible Causes:**
- Backend service not running
- Database connection issues
- Environment variables missing

**Solutions:**
```bash
# Check backend logs
docker-compose logs backend

# Restart backend service
docker-compose restart backend

# Check environment file
cat .env

# Verify MongoDB connection
docker-compose exec backend node -e "
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI).then(() => {
  console.log('✅ Database connected');
}).catch(err => {
  console.log('❌ Database error:', err.message);
});
"
```

#### ❌ Problem: "SSL certificate errors"

**Solutions:**
```bash
# Check SSL certificates
ls -la /etc/letsencrypt/live/your-domain.com/

# Renew SSL certificate
certbot renew
systemctl reload nginx

# Check Nginx SSL config
nginx -t
```

#### ❌ Problem: "MongoDB authentication failed"

**Solutions:**
```bash
# Check MongoDB logs
docker-compose logs mongodb

# Reset MongoDB user
docker-compose exec mongodb mongosh
# In MongoDB shell:
use admin;
db.auth('admin', 'your-root-password');
use lms_saas;
db.dropUser('lms_user');
db.createUser({
  user: 'lms_user', 
  pwd: 'your-password', 
  roles: ['readWrite']
});
```

#### ❌ Problem: "React app shows blank page"

**Solutions:**
```bash
# Check client build
ls -la client/build/

# Rebuild client
docker-compose exec backend bash
cd ../client
npm run build
exit

# Check Nginx logs
docker-compose logs nginx
```

### 3. Performance Issues

#### 🐌 Problem: "Site is slow"

**Diagnostics:**
```bash
# Check system resources
htop
df -h
free -m

# Check container resource usage
docker stats

# Check database performance
docker-compose exec mongodb mongosh lms_saas
db.runCommand({dbstats:1});
```

**Solutions:**
```bash
# Increase PM2 instances
docker-compose exec backend pm2 scale lms-saas 4

# Add Redis caching (already configured)
docker-compose logs redis

# Optimize MongoDB indexes
docker-compose exec mongodb mongosh lms_saas
db.users.getIndexes();
```

### 4. Network & DNS Issues

#### 🌐 Problem: "Domain not resolving"

**Diagnostics:**
```bash
# Check DNS resolution
nslookup your-domain.com
dig your-domain.com

# Test domain from different locations
curl -I https://your-domain.com
```

**Solutions:**
1. Verify DNS A record points to your VPS IP
2. Wait for DNS propagation (up to 24 hours)
3. Use temporary hosts file for testing:
   ```bash
   # On your local machine
   sudo echo "YOUR_VPS_IP your-domain.com" >> /etc/hosts
   ```

#### 🔥 Problem: "Firewall blocking connections"

**Solutions:**
```bash
# Check firewall status
ufw status verbose

# Allow necessary ports
ufw allow 80
ufw allow 443
ufw allow 22

# Check if ports are listening
netstat -tlnp | grep :80
netstat -tlnp | grep :443
```

### 5. Database Issues

#### 💾 Problem: "Database connection lost"

**Diagnostics:**
```bash
# Check MongoDB status
docker-compose exec mongodb mongosh --eval "db.adminCommand('ismaster')"

# Check connection string
echo $MONGODB_URI
```

**Solutions:**
```bash
# Restart MongoDB
docker-compose restart mongodb

# Check MongoDB configuration
docker-compose exec mongodb cat /etc/mongod.conf

# Verify network connectivity
docker-compose exec backend ping mongodb
```

#### 💾 Problem: "Out of disk space"

**Solutions:**
```bash
# Check disk usage
df -h
du -h /var/lib/docker/ | tail -20

# Clean up Docker
docker system prune -a
docker volume prune

# Clean up logs
journalctl --vacuum-size=100M
```

### 6. Memory Issues

#### 🧠 Problem: "Out of memory errors"

**Solutions:**
```bash
# Check memory usage
free -m
docker stats

# Add swap space
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Reduce PM2 instances
docker-compose exec backend pm2 scale lms-saas 2
```

## 🛠️ Maintenance Commands

### Daily Operations
```bash
# Check service health
curl -f https://your-domain.com/health

# View recent logs
docker-compose logs --since="1h"

# Check disk space
df -h
```

### Weekly Maintenance
```bash
# Update containers
cd /var/www/lms-saas
git pull origin master
docker-compose pull
docker-compose up -d --build

# Clean up unused data
docker system prune
```

### Monthly Tasks
```bash
# Renew SSL certificates
certbot renew --quiet

# Update system packages
apt update && apt upgrade -y

# Backup verification
ls -la /var/backups/lms-saas/
```

## 📊 Monitoring & Logs

### Important Log Files
- **Application:** `docker-compose logs backend`
- **Database:** `docker-compose logs mongodb`  
- **Web Server:** `docker-compose logs nginx`
- **System:** `journalctl -u docker`

### Setting Up Monitoring
```bash
# Install monitoring tools
apt install htop iotop nethogs

# Set up log rotation
cat > /etc/logrotate.d/docker << EOF
/var/lib/docker/containers/*/*-json.log {
    rotate 7
    daily
    compress
    size=10M
    missingok
    delaycompress
    copytruncate
}
EOF
```

## 🔐 Security Checklist

### Post-Deployment Security
- [ ] Changed default admin password
- [ ] Updated SSH port (if desired)
- [ ] Configured firewall rules
- [ ] Set up SSL certificates
- [ ] Enabled automatic security updates
- [ ] Configured backup retention
- [ ] Set up monitoring alerts

### Security Commands
```bash
# Check for security updates
apt list --upgradable | grep security

# Review active connections
netstat -tnlp

# Check fail2ban status (if installed)
fail2ban-client status
```

## 📞 Getting Help

### Debug Information to Collect
When asking for help, provide:

1. **System Information:**
   ```bash
   uname -a
   docker --version
   docker-compose --version
   ```

2. **Service Status:**
   ```bash
   docker-compose ps
   docker-compose logs --tail=100
   ```

3. **System Resources:**
   ```bash
   df -h
   free -m
   top -bn1 | head -20
   ```

4. **Error Messages:**
   - Browser console errors (F12)
   - Server logs from the time of issue
   - Any specific error messages

### Emergency Recovery

#### 🚨 Complete System Recovery
```bash
# Stop all services
docker-compose down

# Restore from backup
cd /var/backups/lms-saas
tar -xzf db_YYYYMMDD_HHMMSS.tar.gz
tar -xzf uploads_YYYYMMDD_HHMMSS.tar.gz

# Restart services
cd /var/www/lms-saas
docker-compose up -d
```

#### 🚨 Database Recovery
```bash
# Stop application
docker-compose stop backend

# Restore database
docker-compose exec mongodb mongorestore --db lms_saas /backup/path/

# Start application
docker-compose start backend
```

## ✅ Health Check Script

Create this script for regular health monitoring:

```bash
#!/bin/bash
# health-check.sh

echo "🏥 LMS SaaS Health Check - $(date)"
echo "=================================="

# Check services
docker-compose ps | grep -v "Exit 0" || echo "❌ Some services are down"

# Check disk space
DISK=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ $DISK -gt 80 ]; then
  echo "⚠️  Disk usage high: $DISK%"
else
  echo "✅ Disk usage OK: $DISK%"
fi

# Check memory
MEM=$(free | grep Mem | awk '{printf("%.0f", $3/$2 * 100.0)}')
if [ $MEM -gt 80 ]; then
  echo "⚠️  Memory usage high: $MEM%"
else
  echo "✅ Memory usage OK: $MEM%"
fi

# Check website
if curl -f -s https://your-domain.com/health > /dev/null; then
  echo "✅ Website is responding"
else
  echo "❌ Website is not responding"
fi

echo "=================================="
```

Remember: Most issues can be resolved by restarting services or checking logs. When in doubt, restart the problematic container first!