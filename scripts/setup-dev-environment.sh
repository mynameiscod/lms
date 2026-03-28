#!/bin/bash
# ============================================
# Setup DEV Environment on Same VPS as PROD
# ============================================
# This script sets up a separate DEV environment
# running on port 5001 alongside production
# ============================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}[SETUP]${NC} $1"; }
success() { echo -e "${GREEN}✅ $1${NC}"; }
warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }

echo ""
echo "╔════════════════════════════════════════════════╗"
echo "║   Setup DEV Environment (Same VPS)             ║"
echo "╚════════════════════════════════════════════════╝"
echo ""

DEV_DIR="/root/lms-dev"
PROD_DIR="/root/lms"
DOMAIN="dev.codebegun.com"

# ============================================
# Step 1: Create DEV directory
# ============================================
log "Creating DEV directory..."
mkdir -p "$DEV_DIR"

# Clone or copy from prod
if [ ! -d "$DEV_DIR/.git" ]; then
    if [ -d "$PROD_DIR/.git" ]; then
        log "Copying from PROD..."
        cp -r "$PROD_DIR/"* "$DEV_DIR/" 2>/dev/null || true
        cp -r "$PROD_DIR/.git" "$DEV_DIR/" 2>/dev/null || true
    else
        log "Cloning repository..."
        git clone https://github.com/mynameiscod/lms.git "$DEV_DIR"
    fi
fi

success "DEV directory ready: $DEV_DIR"

# ============================================
# Step 2: Create DEV .env file
# ============================================
log "Creating DEV .env file..."

if [ ! -f "$DEV_DIR/server/.env" ]; then
    cat > "$DEV_DIR/server/.env" << 'ENV'
PORT=5000
MONGODB_URI=mongodb://admin:devpassword123@localhost:27018/lms-saas-dev?authSource=admin
JWT_SECRET=dev-jwt-secret-not-for-production-change-this
JWT_EXPIRES_IN=7d
CLIENT_URL=https://dev.codebegun.com
FRONTEND_URL=https://dev.codebegun.com
NODE_ENV=development
LOG_LEVEL=debug

# Email (use same as prod or use test service)
EMAIL_SERVICE=gmail
EMAIL_USER=infocodebegun@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=LMS DEV <infocodebegun@gmail.com>
ENV

    warn "Created DEV .env - Please update EMAIL_PASSWORD!"
else
    success "DEV .env already exists"
fi

# ============================================
# Step 3: Setup NGINX for dev subdomain
# ============================================
log "Setting up NGINX for dev.codebegun.com..."

if [ -f "$DEV_DIR/nginx/sites-available/lms-dev" ]; then
    cp "$DEV_DIR/nginx/sites-available/lms-dev" /etc/nginx/sites-available/lms-dev
    
    # Enable site
    ln -sf /etc/nginx/sites-available/lms-dev /etc/nginx/sites-enabled/lms-dev
    
    # Test nginx config
    nginx -t
    
    success "NGINX config installed"
else
    warn "NGINX config not found, skipping..."
fi

# ============================================
# Step 4: Open firewall port
# ============================================
log "Opening firewall port 5001..."
ufw allow 5001/tcp 2>/dev/null || true
success "Firewall updated"

# ============================================
# Step 5: Start DEV containers
# ============================================
log "Starting DEV containers..."
cd "$DEV_DIR"
docker-compose -f docker-compose.dev.yml up -d

# ============================================
# Step 6: Get SSL Certificate
# ============================================
echo ""
log "To enable HTTPS for dev.codebegun.com, run:"
echo ""
echo "  1. Add DNS record: dev.codebegun.com → $(curl -s ifconfig.me)"
echo "  2. Get SSL cert:   certbot --nginx -d dev.codebegun.com"
echo "  3. Reload nginx:   systemctl reload nginx"
echo ""

# ============================================
# Summary
# ============================================
echo ""
echo "╔════════════════════════════════════════════════╗"
echo "║         ✅ DEV Environment Ready!              ║"
echo "╚════════════════════════════════════════════════╝"
echo ""
echo "  PROD URL: https://platform.codebegun.com (port 5000)"
echo "  DEV URL:  https://dev.codebegun.com (port 5001)"
echo ""
echo "  DEV direct access: http://$(curl -s ifconfig.me):5001"
echo ""
echo "  DEV Directory: $DEV_DIR"
echo "  DEV Compose:   docker-compose.dev.yml"
echo ""
echo "Commands:"
echo "  Start DEV:    cd $DEV_DIR && docker-compose -f docker-compose.dev.yml up -d"
echo "  Stop DEV:     cd $DEV_DIR && docker-compose -f docker-compose.dev.yml down"
echo "  DEV logs:     docker logs lms-dev-server"
echo ""
success "Setup complete!"
