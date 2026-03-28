#!/bin/bash
# ============================================
# VPS INITIAL SETUP FOR 1M+ USERS
# ============================================
# Run this ONCE when setting up a new VPS
# ============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}[SETUP]${NC} $1"; }
success() { echo -e "${GREEN}✅ $1${NC}"; }
error() { echo -e "${RED}❌ $1${NC}"; }
warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }

echo ""
echo "╔════════════════════════════════════════════════╗"
echo "║   LMS SaaS - VPS Setup for 1M+ Users           ║"
echo "╚════════════════════════════════════════════════╝"
echo ""

# ============================================
# System Requirements Check
# ============================================
log "Checking system..."
TOTAL_RAM=$(free -g | awk '/^Mem:/{print $2}')
TOTAL_CPU=$(nproc)
TOTAL_DISK=$(df -BG / | awk 'NR==2 {print $4}' | sed 's/G//')

echo "  RAM: ${TOTAL_RAM}GB"
echo "  CPU: ${TOTAL_CPU} cores"
echo "  Disk: ${TOTAL_DISK}GB free"

if [ "$TOTAL_RAM" -lt 4 ]; then
    warn "Recommended: 8GB+ RAM for 1M users"
fi
if [ "$TOTAL_CPU" -lt 2 ]; then
    warn "Recommended: 4+ CPU cores for 1M users"
fi

# ============================================
# System Updates
# ============================================
log "Updating system..."
apt-get update && apt-get upgrade -y

# ============================================
# Install Docker
# ============================================
log "Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    usermod -aG docker $USER
    success "Docker installed"
else
    success "Docker already installed"
fi

# Install Docker Compose
if ! docker compose version &> /dev/null; then
    apt-get install -y docker-compose-plugin
    success "Docker Compose installed"
else
    success "Docker Compose already installed"
fi

# ============================================
# System Optimizations for High Traffic
# ============================================
log "Optimizing system for high traffic..."

# Increase file descriptors
cat >> /etc/security/limits.conf << 'EOF'
* soft nofile 65535
* hard nofile 65535
root soft nofile 65535
root hard nofile 65535
EOF

# Kernel optimizations
cat > /etc/sysctl.d/99-lms-optimizations.conf << 'EOF'
# Network performance
net.core.somaxconn = 65535
net.core.netdev_max_backlog = 65535
net.ipv4.tcp_max_syn_backlog = 65535
net.ipv4.tcp_fin_timeout = 15
net.ipv4.tcp_keepalive_time = 300
net.ipv4.tcp_keepalive_probes = 5
net.ipv4.tcp_keepalive_intvl = 15
net.ipv4.tcp_tw_reuse = 1
net.ipv4.ip_local_port_range = 1024 65535

# Memory optimizations  
vm.swappiness = 10
vm.dirty_ratio = 60
vm.dirty_background_ratio = 5

# File system
fs.file-max = 2097152
fs.inotify.max_user_watches = 524288
EOF

sysctl -p /etc/sysctl.d/99-lms-optimizations.conf
success "System optimized"

# ============================================
# Install Monitoring Tools
# ============================================
log "Installing monitoring tools..."
apt-get install -y htop iotop nethogs ncdu

# ============================================
# Setup Firewall
# ============================================
log "Configuring firewall..."
apt-get install -y ufw
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 27017/tcp  # MongoDB (restrict in production)
ufw --force enable
success "Firewall configured"

# ============================================
# Setup Swap (if RAM < 8GB)
# ============================================
if [ "$TOTAL_RAM" -lt 8 ] && [ ! -f /swapfile ]; then
    log "Creating swap file..."
    fallocate -l 4G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    success "Swap created (4GB)"
fi

# ============================================
# Install Certbot for SSL
# ============================================
log "Installing Certbot for SSL..."
apt-get install -y certbot python3-certbot-nginx
success "Certbot installed"

# ============================================
# Create directory structure
# ============================================
log "Creating directory structure..."
mkdir -p /root/lms
mkdir -p /root/lms-backups
mkdir -p /root/lms/nginx/ssl
mkdir -p /root/lms/scripts

# ============================================
# Setup automatic updates
# ============================================
log "Setting up unattended upgrades..."
apt-get install -y unattended-upgrades
dpkg-reconfigure -plow unattended-upgrades

# ============================================
# Setup log rotation
# ============================================
log "Configuring log rotation..."
cat > /etc/logrotate.d/lms << 'EOF'
/root/lms/logs/*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    create 0640 root root
    sharedscripts
}
EOF

# ============================================
# Summary
# ============================================
echo ""
echo "╔════════════════════════════════════════════════╗"
echo "║         ✅ VPS Setup Complete!                 ║"
echo "╚════════════════════════════════════════════════╝"
echo ""
echo "Next steps:"
echo ""
echo "1. Clone your repository:"
echo "   cd /root && git clone <your-repo-url> lms"
echo ""
echo "2. Create .env file:"
echo "   cp /root/lms/server/.env.example /root/lms/server/.env"
echo "   nano /root/lms/server/.env"
echo ""
echo "3. Setup SSL certificate:"
echo "   certbot certonly --standalone -d platform.codebegun.com"
echo ""
echo "4. Start the application:"
echo "   cd /root/lms && docker-compose up -d"
echo ""
echo "5. (For scaling) Use scalable config:"
echo "   docker-compose -f docker-compose.scalable.yml up -d"
echo ""
success "System ready for production!"
