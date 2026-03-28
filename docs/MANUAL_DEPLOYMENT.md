# Manual Deployment Instructions

## Step 1: Build Locally (on your machine)

Open PowerShell and run these commands:

```powershell
cd d:\Simple_CB_LMS\Codebegun\lms-saas

# Build Server
cd server
npm install
npm run build
cd ..

# Build Client
cd client
npm install
npm run build
cd ..
```

---

## Step 2: Push Code to GitHub

```powershell
cd d:\Simple_CB_LMS\Codebegun\lms-saas

git add -A
git commit -m "Manual deployment - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
git push origin master
```

---

## Step 3: SSH into VPS

```bash
ssh root@187.124.97.56
```

When prompted, enter password: `Galaba@181123`

---

## Step 4: Deploy on VPS

Once you're connected to VPS, run these commands:

```bash
# Navigate to app directory
cd /root/lms

# Pull latest code
git pull origin master

# Install and build server
cd server
npm install
npm run build
cd ..

# Install and build client
cd client
npm install
npm run build
cd ..

# Copy client build to web server
sudo cp -r client/build/* /var/www/html/

# Restart the application
cd server
pm2 restart lms-server
```

---

## Step 5: Verify Deployment

```bash
# Check if server is running
pm2 list

# Check server logs
pm2 logs lms-server

# Exit SSH
exit
```

---

## Access Your Application

Open browser and go to:
```
http://187.124.97.56:3000
```

---

## Troubleshooting

### If PM2 process doesn't exist:
```bash
cd /root/lms/server
pm2 start dist/server.js --name lms-server
```

### To restart server:
```bash
pm2 restart lms-server
```

### To stop server:
```bash
pm2 stop lms-server
```

### To view real-time logs:
```bash
pm2 logs lms-server
```

### To run in development mode:
```bash
cd /root/lms/server
npm run dev
```

---

**Summary:**
1. Build locally (server + client)
2. Push to GitHub
3. SSH into VPS
4. Pull code and rebuild on VPS
5. Restart PM2 process
6. Access at http://187.124.97.56:3000
