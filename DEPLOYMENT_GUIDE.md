# One-Click Deployment Guide

## Quick Start

### Option 1: Double-Click to Deploy (Easiest)
1. Navigate to the project root folder: `d:\Simple_CB_LMS\Codebegun\lms-saas`
2. **Double-click `DEPLOY.bat`** file
3. Wait for the deployment to complete
4. Your app will be live at `http://187.124.97.56:3000`

### Option 2: PowerShell Deployment
1. Open PowerShell in the project root directory
2. Run this command:
   ```powershell
   .\deploy.ps1
   ```
3. Wait for completion

## What the Script Does

The deployment script automatically:
1. ✅ Installs dependencies for server and client
2. ✅ Builds the production version of both server and client
3. ✅ Commits changes to git with timestamp
4. ✅ Pushes code to master branch on GitHub
5. ✅ Connects to VPS via SSH
6. ✅ Pulls latest code on VPS
7. ✅ Installs dependencies on VPS
8. ✅ Builds application on VPS
9. ✅ Restarts the application using PM2
10. ✅ Makes app live at http://187.124.97.56:3000

## Prerequisites

### For Windows Users
- PowerShell (included with Windows)
- Git for Windows (for `git` command)
- Node.js with npm

### Optional (For Automated SSH)
For fully automated SSH password entry without prompts, install **sshpass**:

**Windows** (via Windows Subsystem for Linux):
```bash
wsl
sudo apt-get install sshpass
```

**If sshpass is not available**, the script will provide manual SSH commands to run.

## Troubleshooting

### "PowerShell Execution Policy" Error
Run this command first:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### "Git not found" Error
- Install Git for Windows from: https://git-scm.com/download/win
- Restart your terminal

### SSH Connection Issues
If the script can't auto-connect to VPS:
1. The script will display manual commands
2. Open a terminal and run them manually
3. Enter password when prompted: `Galaba@181123`

## Deployment Locations

- **Local Build**: `d:\Simple_CB_LMS\Codebegun\lms-saas\client\build`
- **VPS Address**: `187.124.97.56`
- **VPS App Path**: `/root/lms`
- **VPS Public URL**: `http://187.124.97.56:3000`

## After Deployment

### Verify Deployment
Access the app at: `http://187.124.97.56:3000`

### Check Server Status on VPS
```bash
ssh root@187.124.97.56
pm2 list
pm2 logs lms-server
```

### Manual Server Restart (if needed)
```bash
ssh root@187.124.97.56
pm2 restart lms-server
```

## Environment Variables

The deployment assumes:
- VPS Host: `187.124.97.56`
- VPS User: `root`
- VPS Password: `Galaba@181123`
- App Path on VPS: `/root/lms`

To change these, edit `deploy.ps1` or run with parameters:
```powershell
.\deploy.ps1 -VpsHost "new-ip" -VpsUser "username" -AppPath "/new/path"
```

## Support

For issues or questions:
1. Check the error message in the console
2. Review the troubleshooting section above
3. Check git status: `git status`
4. Verify SSH connection: `ssh root@187.124.97.56`

---

**Last Updated**: March 4, 2026
