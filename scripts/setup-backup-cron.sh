#!/bin/bash
# ============================================
# Setup Automatic Database Backups (Cron)
# ============================================
# Run this once to enable automatic daily backups
# ============================================

set -e

echo ""
echo "╔════════════════════════════════════════╗"
echo "║   Setup Automatic Database Backups     ║"
echo "╚════════════════════════════════════════╝"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "Please run as root: sudo ./setup-backup-cron.sh"
    exit 1
fi

APP_DIR="/root/lms"

# Make backup script executable
chmod +x "$APP_DIR/scripts/backup-database.sh"
chmod +x "$APP_DIR/scripts/restore-database.sh"
chmod +x "$APP_DIR/scripts/safe-deploy.sh"

# Create cron job for daily backup at 3 AM
CRON_JOB="0 3 * * * $APP_DIR/scripts/backup-database.sh >> /var/log/lms-backup.log 2>&1"

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "backup-database.sh"; then
    echo "⚠️ Backup cron job already exists"
else
    # Add cron job
    (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
    echo "✅ Daily backup scheduled at 3:00 AM"
fi

# Create log file
touch /var/log/lms-backup.log
chmod 644 /var/log/lms-backup.log

# Show current cron jobs
echo ""
echo "Current backup schedule:"
crontab -l | grep backup

echo ""
echo "Backup Directory: /root/lms-backups/database/"
echo "Backup Log: /var/log/lms-backup.log"
echo ""
echo "Manual backup: ./scripts/backup-database.sh"
echo "Restore backup: ./scripts/restore-database.sh <backup_name>"
echo ""
echo "✅ Automatic backups configured!"
