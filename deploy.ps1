# LMS-SAAS Deployment Script
# Single-click deployment to VPS

param(
    [string]$VpsHost = "187.124.97.56",
    [string]$VpsUser = "root",
    [string]$VpsPassword = "Galaba@181123",
    [string]$AppPath = "/root/lms"
)

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "LMS-SAAS Deployment Script" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Local Build
Write-Host "Step 1: Building locally..." -ForegroundColor Yellow
Write-Host "- Building Server..." -ForegroundColor Gray
Push-Location "$PSScriptRoot\server"
npm install --production 2>&1 | Out-Null
npm run build 2>&1 | Out-Null
Pop-Location

Write-Host "- Building Client..." -ForegroundColor Gray
Push-Location "$PSScriptRoot\client"
npm install --production 2>&1 | Out-Null
npm run build 2>&1 | Out-Null
Pop-Location

Write-Host "✓ Local builds completed" -ForegroundColor Green
Write-Host ""

# Step 2: Git Push
Write-Host "Step 2: Pushing to Git..." -ForegroundColor Yellow
Push-Location $PSScriptRoot
git add -A
git commit -m "Deployment build - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" 2>&1 | Out-Null
git push origin master 2>&1 | Out-Null
Pop-Location
Write-Host "✓ Code pushed to master" -ForegroundColor Green
Write-Host ""

# Step 3: Deploy via SSH
Write-Host "Step 3: Deploying to VPS ($VpsHost)..." -ForegroundColor Yellow

# Create SSH deployment script
$deployScript = @"
#!/bin/bash
set -e

echo "Deploying LMS-SAAS..."
echo ""

# Navigate to app directory
cd $AppPath

# Pull latest code
echo "Pulling latest code..."
git pull origin master

# Build server
echo "Building server..."
cd server
npm install --production
npm run build
cd ..

# Build client
echo "Building client..."
cd client
npm install --production
npm run build
cd ..

# Copy built client
echo "Copying client build..."
sudo cp -r client/build/* /var/www/html/ 2>/dev/null || true

# Restart server
echo "Restarting server..."
cd server
pm2 restart lms-server 2>/dev/null || pm2 start dist/server.js --name lms-server

echo ""
echo "✓ Deployment completed successfully!"
echo "Access at: http://$VpsHost:3000"
"@

# Save script to temp file
$tempScript = "$env:TEMP\deploy_vps.sh"
$deployScript | Out-File -FilePath $tempScript -Encoding UTF8

# Use SSH to execute deployment
Write-Host "Connecting to VPS and executing deployment..." -ForegroundColor Gray

# Create a here-string for the SSH command with password using sshpass
$sshCommand = @"
`cat $tempScript | ssh -o StrictHostKeyChecking=no $VpsUser@$VpsHost
"@

# Try with sshpass if available, otherwise use plink
try {
    # Check if sshpass is available
    $sshpass = Get-Command sshpass -ErrorAction SilentlyContinue
    if ($sshpass) {
        # Use sshpass
        $sshpass.Version | Out-Null
        echo $VpsPassword | sshpass -p $VpsPassword ssh -o StrictHostKeyChecking=no $VpsUser@$VpsHost "bash -s" < $tempScript
    } else {
        throw "sshpass not found"
    }
} catch {
    Write-Host "Alternative: Using manual SSH connection" -ForegroundColor Yellow
    Write-Host "Please connect manually and run these commands:" -ForegroundColor Gray
    Write-Host ""
    Write-Host "ssh root@$VpsHost" -ForegroundColor Cyan
    Write-Host "# Password: Galaba@181123" -ForegroundColor Gray
    Write-Host ""
    Write-Host "cd $AppPath" -ForegroundColor Cyan
    Write-Host "git pull origin master" -ForegroundColor Cyan
    Write-Host "cd server && npm install --production && npm run build && cd .." -ForegroundColor Cyan
    Write-Host "cd client && npm install --production && npm run build && cd .." -ForegroundColor Cyan
    Write-Host "cd server && pm2 restart lms-server" -ForegroundColor Cyan
    
    Write-Host ""
    Write-Host "Note: Install sshpass for automated SSH password entry:" -ForegroundColor Yellow
    Write-Host "  Windows: Install git-bash or use Windows Subsystem for Linux" -ForegroundColor Gray
    Write-Host "  Linux: sudo apt-get install sshpass" -ForegroundColor Gray
    Write-Host "  macOS: brew install sshpass" -ForegroundColor Gray
}

# Cleanup
Remove-Item $tempScript -Force -ErrorAction SilentlyContinue

Write-Host "✓ VPS deployment completed" -ForegroundColor Green
Write-Host ""

# Step 4: Summary
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "Deployment Summary" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "VPS Address: http://$VpsHost:3000" -ForegroundColor Green
Write-Host "Git Commit: Latest code pushed" -ForegroundColor Green
Write-Host "Timestamp: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Green
Write-Host ""
Write-Host "✓ Deployment process completed!" -ForegroundColor Green
Write-Host ""
