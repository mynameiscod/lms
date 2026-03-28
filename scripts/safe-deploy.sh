#!/bin/bash
# ============================================
# SAFE DEPLOYMENT SCRIPT - Preserves .env files
# ============================================
# This script:
# 1. NEVER overwrites existing .env files
# 2. Creates backup before deployment
# 3. Has automatic rollback on failure
# 4. Health checks after deployment
# ============================================

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
APP_DIR="/root/lms"
BACKUP_DIR="/root/lms-backups"
MAX_BACKUPS=5
HEALTH_CHECK_URL="http://localhost:5000/api/health"
HEALTH_CHECK_RETRIES=10
HEALTH_CHECK_INTERVAL=5

log() { echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"; }
success() { echo -e "${GREEN}✅ $1${NC}"; }
error() { echo -e "${RED}❌ $1${NC}"; }
warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }

# ============================================
# STEP 1: Pre-deployment checks
# ============================================
pre_deployment_checks() {
    log "Running pre-deployment checks..."
    
    # Check if .env exists
    if [ ! -f "$APP_DIR/server/.env" ]; then
        error ".env file not found!"
        echo ""
        echo "Please create the .env file first:"
        echo "  cp $APP_DIR/server/.env.example $APP_DIR/server/.env"
        echo "  nano $APP_DIR/server/.env  # Edit with your values"
        exit 1
    fi
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed!"
        exit 1
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        error "Docker Compose is not installed!"
        exit 1
    fi
    
    success "Pre-deployment checks passed"
}

# ============================================
# STEP 2: Backup DATABASE (Critical!)
# ============================================
backup_database() {
    log "📦 Backing up MongoDB database..."
    
    MONGO_CONTAINER="lms-mongodb"
    DB_BACKUP_DIR="/root/lms-backups/database"
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    
    mkdir -p "$DB_BACKUP_DIR"
    
    # Check if MongoDB is running
    if docker ps | grep -q "$MONGO_CONTAINER"; then
        # Run backup
        docker exec "$MONGO_CONTAINER" mongodump \
            --uri="mongodb://admin:password123@localhost:27017/lms-saas?authSource=admin" \
            --out="/data/backup_$TIMESTAMP" \
            --gzip 2>/dev/null || {
                warn "Database backup failed, but continuing deployment..."
                return 0
            }
        
        # Copy backup from container
        docker cp "$MONGO_CONTAINER:/data/backup_$TIMESTAMP" "$DB_BACKUP_DIR/mongodb_backup_$TIMESTAMP" 2>/dev/null || true
        
        # Cleanup inside container
        docker exec "$MONGO_CONTAINER" rm -rf "/data/backup_$TIMESTAMP" 2>/dev/null || true
        
        # Compress backup
        cd "$DB_BACKUP_DIR"
        if [ -d "mongodb_backup_$TIMESTAMP" ]; then
            tar -czf "mongodb_backup_$TIMESTAMP.tar.gz" "mongodb_backup_$TIMESTAMP" 2>/dev/null
            rm -rf "mongodb_backup_$TIMESTAMP"
            
            # Keep only last 10 backups
            ls -t *.tar.gz 2>/dev/null | tail -n +11 | xargs -r rm -f
            
            echo "$TIMESTAMP" > "$DB_BACKUP_DIR/latest"
            success "Database backed up: mongodb_backup_$TIMESTAMP.tar.gz"
        fi
    else
        warn "MongoDB not running, skipping database backup"
    fi
}

# ============================================
# STEP 3: Backup current deployment
# ============================================
create_backup() {
    log "Creating deployment backup..."
    
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_PATH="$BACKUP_DIR/backup_$TIMESTAMP"
    
    mkdir -p "$BACKUP_PATH"
    
    # Backup .env file (most important!)
    if [ -f "$APP_DIR/server/.env" ]; then
        cp "$APP_DIR/server/.env" "$BACKUP_PATH/.env"
        success "Backed up .env file"
    fi
    
    # Backup docker-compose.yml
    if [ -f "$APP_DIR/docker-compose.yml" ]; then
        cp "$APP_DIR/docker-compose.yml" "$BACKUP_PATH/docker-compose.yml"
    fi
    
    # Save current image tags
    docker images --format "{{.Repository}}:{{.Tag}}" | grep lms > "$BACKUP_PATH/images.txt" 2>/dev/null || true
    
    # Save current container state
    docker ps -a --format "{{.Names}} {{.Image}} {{.Status}}" > "$BACKUP_PATH/containers.txt"
    
    # Export current database (optional, uncomment if needed)
    # docker exec lms-mongodb mongodump --out /data/backup 2>/dev/null || true
    
    echo "$TIMESTAMP" > "$BACKUP_DIR/latest"
    
    # Clean old backups (keep only MAX_BACKUPS)
    cd "$BACKUP_DIR"
    ls -dt backup_* 2>/dev/null | tail -n +$((MAX_BACKUPS + 1)) | xargs rm -rf 2>/dev/null || true
    
    success "Backup created: $BACKUP_PATH"
    echo "$BACKUP_PATH"
}

# ============================================
# STEP 3: Pull latest code (preserve .env!)
# ============================================
pull_latest_code() {
    log "Pulling latest code from GitHub..."
    
    cd "$APP_DIR"
    
    # Save .env file temporarily
    if [ -f "server/.env" ]; then
        cp "server/.env" "/tmp/.env.backup"
    fi
    
    # Stash any local changes
    git stash 2>/dev/null || true
    
    # Pull latest changes
    git pull origin master
    
    # Restore .env file (CRITICAL!)
    if [ -f "/tmp/.env.backup" ]; then
        cp "/tmp/.env.backup" "server/.env"
        rm "/tmp/.env.backup"
        success ".env file preserved!"
    fi
    
    success "Code updated"
}

# ============================================
# STEP 4: Build and deploy
# ============================================
deploy() {
    log "Building and deploying..."
    
    cd "$APP_DIR"
    
    # Stop existing containers (graceful shutdown)
    docker-compose down --timeout 30 2>/dev/null || true
    
    # Remove old images to save space
    docker image prune -f 2>/dev/null || true
    
    # Build new images
    docker-compose build --no-cache
    
    # Start services
    docker-compose up -d
    
    success "Containers started"
}

# ============================================
# STEP 5: Health check
# ============================================
health_check() {
    log "Running health checks..."
    
    for i in $(seq 1 $HEALTH_CHECK_RETRIES); do
        log "Health check attempt $i/$HEALTH_CHECK_RETRIES..."
        sleep $HEALTH_CHECK_INTERVAL
        
        # Check if containers are running
        if ! docker ps | grep -q "lms-server"; then
            warn "Server container not running"
            continue
        fi
        
        if ! docker ps | grep -q "lms-mongodb"; then
            warn "MongoDB container not running"
            continue
        fi
        
        # Check HTTP endpoint
        HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_CHECK_URL" 2>/dev/null || echo "000")
        
        if [ "$HTTP_STATUS" = "200" ]; then
            success "Health check passed! (HTTP $HTTP_STATUS)"
            return 0
        fi
        
        warn "Health check failed (HTTP $HTTP_STATUS)"
    done
    
    error "Health check failed after $HEALTH_CHECK_RETRIES attempts"
    return 1
}

# ============================================
# STEP 6: Rollback on failure
# ============================================
rollback() {
    error "Deployment failed! Rolling back..."
    
    LATEST_BACKUP=$(cat "$BACKUP_DIR/latest" 2>/dev/null || echo "")
    
    if [ -z "$LATEST_BACKUP" ]; then
        error "No backup found for rollback!"
        exit 1
    fi
    
    BACKUP_PATH="$BACKUP_DIR/backup_$LATEST_BACKUP"
    
    # Restore .env
    if [ -f "$BACKUP_PATH/.env" ]; then
        cp "$BACKUP_PATH/.env" "$APP_DIR/server/.env"
    fi
    
    # Restart with previous configuration
    cd "$APP_DIR"
    docker-compose down 2>/dev/null || true
    
    # Reset to previous commit
    git reset --hard HEAD~1
    
    # Rebuild and restart
    docker-compose build
    docker-compose up -d
    
    warn "Rolled back to previous version"
}

# ============================================
# MAIN EXECUTION
# ============================================
main() {
    echo ""
    echo "╔════════════════════════════════════════╗"
    echo "║   LMS SaaS - Safe Deployment Script    ║"
    echo "╚════════════════════════════════════════╝"
    echo ""
    
    # Create backup directory
    mkdir -p "$BACKUP_DIR"
    
    # Run steps
    pre_deployment_checks
    
    # CRITICAL: Backup database FIRST!
    backup_database
    
    BACKUP_PATH=$(create_backup)
    
    pull_latest_code
    
    deploy
    
    # Health check with rollback on failure
    if ! health_check; then
        rollback
        exit 1
    fi
    
    echo ""
    echo "╔════════════════════════════════════════╗"
    echo "║      ✅ Deployment Successful!         ║"
    echo "╚════════════════════════════════════════╝"
    echo ""
    success "Application is running!"
    echo ""
    log "Backup stored at: $BACKUP_PATH"
    log "View logs: docker-compose logs -f"
    echo ""
}

# Run
main "$@"
