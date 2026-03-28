#!/bin/bash
# 🚀 LMS SaaS Quick VPS Deployment
# One-command deployment to your VPS

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

print_header() {
    echo -e "${PURPLE}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "        🚀 LMS SaaS VPS Deployment Tool 🚀"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${NC}"
}

print_step() {
    echo -e "${CYAN}[STEP]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Load configuration if exists
if [ -f "./vps-config.env" ]; then
    source ./vps-config.env
    print_info "Configuration loaded from vps-config.env"
else
    print_warning "No vps-config.env found, using interactive setup"
fi

interactive_setup() {
    print_step "Interactive VPS Setup"
    
    # VPS Connection Details
    if [[ -z "$VPS_IP" || "$VPS_IP" == "YOUR_VPS_IP_ADDRESS" ]]; then
        read -p "🌐 Enter your VPS IP address: " VPS_IP
    fi
    
    if [[ -z "$VPS_USER" ]]; then
        read -p "👤 Enter SSH username (default: root): " VPS_USER
        VPS_USER=${VPS_USER:-root}
    fi
    
    if [[ -z "$VPS_PORT" ]]; then
        read -p "🔌 Enter SSH port (default: 22): " VPS_PORT
        VPS_PORT=${VPS_PORT:-22}
    fi
    
    # Domain Configuration
    if [[ -z "$DOMAIN_NAME" || "$DOMAIN_NAME" == "your-domain.com" ]]; then
        read -p "🌍 Enter your domain name: " DOMAIN_NAME
    fi
    
    if [[ -z "$EMAIL" || "$EMAIL" == "admin@your-domain.com" ]]; then
        read -p "📧 Enter admin email: " EMAIL
    fi
    
    # Deployment Method
    echo -e "\n${YELLOW}Choose deployment method:${NC}"
    echo "1) Docker Compose (Recommended)"
    echo "2) Direct Installation"
    read -p "Enter choice [1-2]: " DEPLOY_METHOD
    DEPLOY_METHOD=${DEPLOY_METHOD:-1}
    
    # Generate secure passwords
    export MONGO_PASSWORD=$(openssl rand -base64 16)
    export REDIS_PASSWORD=$(openssl rand -base64 16)
    export JWT_SECRET=$(openssl rand -base64 32)
    export SESSION_SECRET=$(openssl rand -base64 32)
    
    print_success "Interactive setup completed"
}

validate_requirements() {
    print_step "Validating requirements"
    
    # Check if ssh is available
    if ! command -v ssh &> /dev/null; then
        print_error "SSH client is required but not installed"
        exit 1
    fi
    
    # Check if scp is available
    if ! command -v scp &> /dev/null; then
        print_error "SCP is required but not installed" 
        exit 1
    fi
    
    # Validate configuration
    if [[ -z "$VPS_IP" || -z "$DOMAIN_NAME" || -z "$EMAIL" ]]; then
        print_error "Missing required configuration. Please run interactive setup."
        interactive_setup
    fi
    
    print_success "Requirements validated"
}

test_connection() {
    print_step "Testing VPS connection"
    
    if ssh -o ConnectTimeout=10 -o BatchMode=yes -p "$VPS_PORT" "$VPS_USER@$VPS_IP" 'echo "Connection successful"' 2>/dev/null; then
        print_success "VPS connection established"
        return 0
    else
        print_warning "Could not establish passwordless SSH connection"
        echo "Please ensure:"
        echo "1. SSH key is set up for passwordless authentication"
        echo "2. VPS IP, username, and port are correct"
        echo "3. VPS is accessible from your network"
        
        read -p "Continue anyway? [y/N]: " continue_anyway
        if [[ ! "$continue_anyway" =~ ^[Yy]$ ]]; then
            print_error "Deployment cancelled"
            exit 1
        fi
    fi
}

prepare_deployment_files() {
    print_step "Preparing deployment files"
    
    # Create temporary deployment directory
    DEPLOY_DIR="/tmp/lms-saas-deploy-$(date +%s)"
    mkdir -p "$DEPLOY_DIR"
    
    # Copy necessary files
    cp vps-deploy.sh "$DEPLOY_DIR/"
    cp -r nginx "$DEPLOY_DIR/" 2>/dev/null || true
    cp -r scripts "$DEPLOY_DIR/" 2>/dev/null || true
    
    if [[ "$DEPLOY_METHOD" == "1" ]]; then
        cp docker-compose.production.yml "$DEPLOY_DIR/docker-compose.yml"
        cp Dockerfile "$DEPLOY_DIR/"
    fi
    
    # Create environment file for VPS
    cat > "$DEPLOY_DIR/.env" << EOF
# LMS SaaS Production Environment
NODE_ENV=production
DOMAIN_NAME=$DOMAIN_NAME
EMAIL=$EMAIL
DB_NAME=${DB_NAME:-lms_saas}
MONGO_ROOT_USER=admin
MONGO_ROOT_PASSWORD=$MONGO_PASSWORD
MONGO_USER=${MONGO_USER:-lms_user}
MONGO_PASSWORD=$MONGO_PASSWORD
REDIS_PASSWORD=$REDIS_PASSWORD
JWT_SECRET=$JWT_SECRET
SESSION_SECRET=$SESSION_SECRET
BACKUP_RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-7}
SMTP_HOST=${SMTP_HOST:-}
SMTP_PORT=${SMTP_PORT:-587}
SMTP_USER=${SMTP_USER:-}
SMTP_PASS=${SMTP_PASS:-}
EOF
    
    # Make scripts executable
    chmod +x "$DEPLOY_DIR"/*.sh 2>/dev/null || true
    chmod +x "$DEPLOY_DIR"/scripts/*.sh 2>/dev/null || true
    
    print_success "Deployment files prepared in $DEPLOY_DIR"
}

upload_files() {
    print_step "Uploading files to VPS"
    
    # Create remote directory
    ssh -p "$VPS_PORT" "$VPS_USER@$VPS_IP" "mkdir -p /tmp/lms-deploy"
    
    # Upload deployment files
    if scp -r -P "$VPS_PORT" "$DEPLOY_DIR"/* "$VPS_USER@$VPS_IP:/tmp/lms-deploy/"; then
        print_success "Files uploaded successfully"
    else
        print_error "Failed to upload files"
        exit 1
    fi
    
    # Clean up local temp directory
    rm -rf "$DEPLOY_DIR"
}

run_deployment() {
    print_step "Running deployment on VPS"
    
    if [[ "$DEPLOY_METHOD" == "1" ]]; then
        print_info "Using Docker Compose deployment"
        ssh -p "$VPS_PORT" "$VPS_USER@$VPS_IP" << 'EOF'
cd /tmp/lms-deploy
source .env

echo "🐳 Starting Docker Compose deployment..."

# Update system
apt update && apt upgrade -y

# Install Docker and Docker Compose if not present
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    systemctl enable docker
    systemctl start docker
fi

if ! command -v docker-compose &> /dev/null; then
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
fi

# Clone repository
git clone https://github.com/mynameiscod/lms.git /var/www/lms-saas || (cd /var/www/lms-saas && git pull)
cd /var/www/lms-saas

# Copy configuration files
cp /tmp/lms-deploy/.env .
cp /tmp/lms-deploy/docker-compose.yml .
cp -r /tmp/lms-deploy/nginx .
cp -r /tmp/lms-deploy/scripts .

# Generate SSL certificate
apt install -y certbot
certbot certonly --standalone --preferred-challenges http -d "$DOMAIN_NAME" --email "$EMAIL" --agree-tos --non-interactive || echo "SSL setup skipped"

# Copy SSL certificates to nginx directory
mkdir -p ssl
cp /etc/letsencrypt/live/"$DOMAIN_NAME"/fullchain.pem ssl/ 2>/dev/null || echo "SSL cert copy failed"
cp /etc/letsencrypt/live/"$DOMAIN_NAME"/privkey.pem ssl/ 2>/dev/null || echo "SSL key copy failed"

# Start services
docker-compose down || true
docker-compose up -d --build

echo "🎉 Docker deployment completed!"
EOF
    else
        print_info "Using direct installation"
        ssh -p "$VPS_PORT" "$VPS_USER@$VPS_IP" << 'EOF'
cd /tmp/lms-deploy
source .env
chmod +x vps-deploy.sh
./vps-deploy.sh
EOF
    fi
}

check_deployment() {
    print_step "Checking deployment status"
    
    # Wait a bit for services to start
    sleep 30
    
    # Check if site is responding
    if curl -s -o /dev/null -w "%{http_code}" "http://$DOMAIN_NAME" | grep -q "200\|301\|302"; then
        print_success "✅ Website is responding"
    else
        print_warning "⚠️  Website might not be fully ready yet"
    fi
    
    # Check if API is responding
    if curl -s -o /dev/null -w "%{http_code}" "http://$DOMAIN_NAME/api/health" 2>/dev/null | grep -q "200"; then
        print_success "✅ API is responding"
    else
        print_warning "⚠️  API might not be fully ready yet"
    fi
}

print_completion() {
    echo -e "\n${GREEN}🎉 DEPLOYMENT COMPLETED! 🎉${NC}\n"
    echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}🌐 Application URL:${NC} https://$DOMAIN_NAME"
    echo -e "${CYAN}🔧 API Endpoint:${NC} https://$DOMAIN_NAME/api"
    echo -e "${CYAN}📧 Admin Email:${NC} admin@lms-saas.com"
    echo -e "${CYAN}🔑 Admin Password:${NC} admin123 (⚠️ CHANGE THIS!)"
    echo -e "\n${YELLOW}📋 Next Steps:${NC}"
    echo -e "1. Visit https://$DOMAIN_NAME and log in"
    echo -e "2. Change the default admin password immediately"
    echo -e "3. Configure your organization settings"
    echo -e "4. Create your first course content"
    echo -e "\n${YELLOW}🛠️ Management Commands:${NC}"
    echo -e "• Check logs: ssh $VPS_USER@$VPS_IP 'docker-compose -f /var/www/lms-saas/docker-compose.yml logs'"
    echo -e "• Restart services: ssh $VPS_USER@$VPS_IP 'cd /var/www/lms-saas && docker-compose restart'"
    echo -e "• View status: ssh $VPS_USER@$VPS_IP 'cd /var/www/lms-saas && docker-compose ps'"
    echo -e "\n${GREEN}🚀 Your LMS SaaS platform is now live! 🚀${NC}"
    echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

main() {
    print_header
    
    # Check if configuration exists, otherwise run interactive setup
    if [[ -z "$VPS_IP" || "$VPS_IP" == "YOUR_VPS_IP_ADDRESS" ]]; then
        interactive_setup
    fi
    
    validate_requirements
    test_connection
    prepare_deployment_files
    upload_files
    run_deployment
    check_deployment
    print_completion
}

# Handle script parameters
case "${1:-}" in
    "setup")
        interactive_setup
        ;;
    "test")
        validate_requirements
        test_connection
        ;;
    "deploy")
        main
        ;;
    *)
        echo "Usage: $0 [setup|test|deploy]"
        echo ""
        echo "Commands:"
        echo "  setup  - Run interactive configuration"
        echo "  test   - Test VPS connection"
        echo "  deploy - Full deployment (default)"
        echo ""
        echo "If no command is specified, full deployment will run."
        echo ""
        main
        ;;
esac