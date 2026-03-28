#!/bin/bash
# 🚀 Complete VPS Deployment Script for LMS SaaS
# Version: 1.0
# Compatible: Ubuntu/Debian servers

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="lms-saas"
REPO_URL="https://github.com/mynameiscod/lms.git"
PROJECT_PATH="/var/www/${PROJECT_NAME}"
NGINX_CONFIG="/etc/nginx/sites-available/${PROJECT_NAME}"
SYSTEMD_SERVICE="/etc/systemd/system/${PROJECT_NAME}.service"

# Default values (customize these)
DOMAIN_NAME="${DOMAIN_NAME:-your-domain.com}"
EMAIL="${EMAIL:-admin@your-domain.com}"
DB_NAME="${DB_NAME:-lms_saas_db}"
JWT_SECRET="${JWT_SECRET:-$(openssl rand -base64 32)}"
SESSION_SECRET="${SESSION_SECRET:-$(openssl rand -base64 32)}"

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_root() {
    if [[ $EUID -ne 0 ]]; then
        print_error "This script must be run as root"
        exit 1
    fi
}

update_system() {
    print_status "Updating system packages..."
    apt update && apt upgrade -y
    print_success "System updated successfully"
}

install_dependencies() {
    print_status "Installing dependencies..."
    
    # Install basic tools
    apt install -y curl wget git unzip software-properties-common apt-transport-https ca-certificates gnupg lsb-release
    
    # Install Node.js 18 LTS
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    apt install -y nodejs
    
    # Install Docker
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    apt update
    apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    
    # Install Docker Compose
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    
    # Install MongoDB
    wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
    echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
    apt update
    apt install -y mongodb-org
    
    # Install Nginx
    apt install -y nginx
    
    # Install PM2 globally
    npm install -g pm2
    
    print_success "All dependencies installed successfully"
}

setup_mongodb() {
    print_status "Setting up MongoDB..."
    
    systemctl start mongod
    systemctl enable mongod
    
    # Create database user
    mongosh --eval "
    use admin;
    db.createUser({
        user: 'lms_admin',
        pwd: '$(openssl rand -base64 12)',
        roles: ['readWriteAnyDatabase', 'dbAdminAnyDatabase']
    });
    use ${DB_NAME};
    db.createUser({
        user: 'lms_user',
        pwd: '$(openssl rand -base64 12)',
        roles: ['readWrite']
    });
    "
    
    print_success "MongoDB setup completed"
}

clone_project() {
    print_status "Cloning project repository..."
    
    # Remove existing directory if present
    if [ -d "$PROJECT_PATH" ]; then
        rm -rf "$PROJECT_PATH"
    fi
    
    # Clone repository
    git clone "$REPO_URL" "$PROJECT_PATH"
    cd "$PROJECT_PATH"
    
    # Set proper permissions
    chown -R www-data:www-data "$PROJECT_PATH"
    
    print_success "Project cloned successfully"
}

setup_environment() {
    print_status "Setting up environment variables..."
    
    # Create server .env file
    cat > "$PROJECT_PATH/server/.env" << EOF
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb://lms_user:$(openssl rand -base64 12)@localhost:27017/${DB_NAME}
JWT_SECRET=${JWT_SECRET}
SESSION_SECRET=${SESSION_SECRET}
CLIENT_URL=https://${DOMAIN_NAME}
EMAIL_FROM=${EMAIL}
CORS_ORIGIN=https://${DOMAIN_NAME}
EOF

    # Create client .env file
    cat > "$PROJECT_PATH/client/.env" << EOF
REACT_APP_API_URL=https://${DOMAIN_NAME}/api
REACT_APP_WS_URL=wss://${DOMAIN_NAME}
GENERATE_SOURCEMAP=false
EOF

    print_success "Environment files created"
}

build_application() {
    print_status "Building application..."
    
    cd "$PROJECT_PATH"
    
    # Install root dependencies
    npm install
    
    # Build shared modules
    cd shared
    npm install
    npm run build
    cd ..
    
    # Build client
    cd client
    npm install
    npm run build
    cd ..
    
    # Build server
    cd server
    npm install
    npm run build
    cd ..
    
    print_success "Application built successfully"
}

setup_nginx() {
    print_status "Setting up Nginx configuration..."
    
    cat > "$NGINX_CONFIG" << EOF
server {
    listen 80;
    server_name ${DOMAIN_NAME} www.${DOMAIN_NAME};
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ${DOMAIN_NAME} www.${DOMAIN_NAME};
    
    ssl_certificate /etc/letsencrypt/live/${DOMAIN_NAME}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN_NAME}/privkey.pem;
    
    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    
    # Root directory
    root ${PROJECT_PATH}/client/build;
    index index.html;
    
    # API proxy
    location /api/ {
        proxy_pass http://localhost:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
    }
    
    # WebSocket support
    location /socket.io/ {
        proxy_pass http://localhost:5000/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # Static files with caching
    location ~* \.(css|js|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files \$uri =404;
    }
    
    # React app - catch all
    location / {
        try_files \$uri \$uri/ /index.html;
    }
    
    # Upload size limit
    client_max_body_size 100M;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript;
}
EOF

    # Enable the site
    ln -sf "$NGINX_CONFIG" /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
    
    # Test configuration
    nginx -t
    
    print_success "Nginx configured successfully"
}

setup_ssl() {
    print_status "Setting up SSL certificate with Let's Encrypt..."
    
    # Install Certbot
    apt install -y certbot python3-certbot-nginx
    
    # Stop Nginx temporarily
    systemctl stop nginx
    
    # Get SSL certificate
    certbot certonly --standalone --preferred-challenges http -d "$DOMAIN_NAME" -d "www.$DOMAIN_NAME" --email "$EMAIL" --agree-tos --non-interactive
    
    # Setup auto-renewal
    crontab -l | { cat; echo "0 12 * * * /usr/bin/certbot renew --quiet && systemctl reload nginx"; } | crontab -
    
    # Start Nginx
    systemctl start nginx
    systemctl enable nginx
    
    print_success "SSL certificate installed and configured"
}

setup_systemd_service() {
    print_status "Setting up systemd service..."
    
    cat > "$SYSTEMD_SERVICE" << EOF
[Unit]
Description=LMS SaaS Backend Server
After=network.target mongod.service

[Service]
Type=simple
User=www-data
WorkingDirectory=${PROJECT_PATH}/server
Environment=NODE_ENV=production
ExecStart=/usr/bin/node dist/app.js
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
    systemctl enable "$PROJECT_NAME"
    
    print_success "Systemd service configured"
}

setup_pm2() {
    print_status "Setting up PM2 process manager..."
    
    cd "$PROJECT_PATH/server"
    
    # Create PM2 ecosystem file
    cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: '${PROJECT_NAME}',
    script: 'dist/app.js',
    cwd: '${PROJECT_PATH}/server',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: '/var/log/${PROJECT_NAME}/error.log',
    out_file: '/var/log/${PROJECT_NAME}/out.log',
    log_file: '/var/log/${PROJECT_NAME}/combined.log',
    max_memory_restart: '1G',
    node_args: '--max_old_space_size=1024'
  }]
}
EOF

    # Create log directory
    mkdir -p "/var/log/${PROJECT_NAME}"
    chown www-data:www-data "/var/log/${PROJECT_NAME}"
    
    # Start with PM2
    sudo -u www-data pm2 start ecosystem.config.js
    sudo -u www-data pm2 save
    sudo -u www-data pm2 startup
    
    print_success "PM2 configured and started"
}

create_backup_script() {
    print_status "Creating backup script..."
    
    cat > "/usr/local/bin/${PROJECT_NAME}-backup" << EOF
#!/bin/bash
BACKUP_DIR="/var/backups/${PROJECT_NAME}"
DATE=\$(date +%Y%m%d_%H%M%S)

mkdir -p "\$BACKUP_DIR"

# Backup MongoDB
mongodump --db ${DB_NAME} --out "\$BACKUP_DIR/db_\$DATE"

# Backup application files
tar -czf "\$BACKUP_DIR/app_\$DATE.tar.gz" -C /var/www ${PROJECT_NAME}

# Keep only last 7 backups
find "\$BACKUP_DIR" -name "db_*" -mtime +7 -exec rm -rf {} \;
find "\$BACKUP_DIR" -name "app_*.tar.gz" -mtime +7 -delete

echo "Backup completed: \$DATE"
EOF

    chmod +x "/usr/local/bin/${PROJECT_NAME}-backup"
    
    # Setup daily backup cron
    crontab -l | { cat; echo "0 2 * * * /usr/local/bin/${PROJECT_NAME}-backup"; } | crontab -
    
    print_success "Backup script created and scheduled"
}

setup_firewall() {
    print_status "Configuring firewall..."
    
    ufw --force enable
    ufw default deny incoming
    ufw default allow outgoing
    ufw allow ssh
    ufw allow 'Nginx Full'
    ufw allow 80
    ufw allow 443
    
    print_success "Firewall configured"
}

final_checks() {
    print_status "Running final checks..."
    
    # Check services status
    systemctl is-active --quiet mongod && print_success "MongoDB is running" || print_error "MongoDB is not running"
    systemctl is-active --quiet nginx && print_success "Nginx is running" || print_error "Nginx is not running"
    
    # Check PM2 processes
    sudo -u www-data pm2 list | grep -q "${PROJECT_NAME}" && print_success "PM2 process is running" || print_error "PM2 process is not running"
    
    # Check SSL certificate
    [ -f "/etc/letsencrypt/live/${DOMAIN_NAME}/fullchain.pem" ] && print_success "SSL certificate exists" || print_error "SSL certificate missing"
    
    # Test application
    curl -s -o /dev/null -w "%{http_code}" "https://${DOMAIN_NAME}" | grep -q "200" && print_success "Application is accessible" || print_warning "Application might not be responding"
}

print_deployment_info() {
    echo -e "\n${GREEN}🎉 DEPLOYMENT COMPLETED SUCCESSFULLY! 🎉${NC}\n"
    echo -e "${BLUE}Application URL:${NC} https://${DOMAIN_NAME}"
    echo -e "${BLUE}API URL:${NC} https://${DOMAIN_NAME}/api"
    echo -e "${BLUE}Project Path:${NC} ${PROJECT_PATH}"
    echo -e "${BLUE}Log Files:${NC} /var/log/${PROJECT_NAME}/"
    echo -e "${BLUE}Nginx Config:${NC} ${NGINX_CONFIG}"
    echo -e "\n${YELLOW}Useful Commands:${NC}"
    echo -e "• View logs: sudo -u www-data pm2 logs ${PROJECT_NAME}"
    echo -e "• Restart app: sudo -u www-data pm2 restart ${PROJECT_NAME}"
    echo -e "• Reload Nginx: systemctl reload nginx"
    echo -e "• Check MongoDB: systemctl status mongod"
    echo -e "• Backup: /usr/local/bin/${PROJECT_NAME}-backup"
    echo -e "\n${GREEN}Setup completed! Your LMS SaaS is now live! 🚀${NC}\n"
}

main() {
    print_status "Starting LMS SaaS VPS deployment..."
    
    check_root
    update_system
    install_dependencies
    setup_mongodb
    clone_project
    setup_environment
    build_application
    setup_nginx
    setup_ssl
    setup_pm2
    create_backup_script
    setup_firewall
    final_checks
    print_deployment_info
}

# Run only if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi