# GitHub Actions Auto-Deployment Setup

## What This Does

When you push code to the `master` branch, GitHub Actions automatically:
1. ✅ Checks out your code
2. ✅ Builds the server
3. ✅ Builds the client
4. ✅ Connects to VPS
5. ✅ Pulls latest code
6. ✅ Rebuilds on VPS
7. ✅ Restarts the application
8. ✅ Makes it live at http://187.124.97.56:3000

## Setup Instructions

### Step 1: Add GitHub Secret

GitHub Actions needs your VPS password stored as a secret.

1. Go to your GitHub repository: `https://github.com/mynameiscod/lms`
2. Click **Settings** (top navigation)
3. Click **Secrets and variables** → **Actions** (left sidebar)
4. Click **New repository secret**
5. Name: `VPS_PASSWORD`
6. Value: `Galaba@181123`
7. Click **Add secret**

**Screenshot location:**
```
Repository → Settings → Secrets and variables → Actions → New repository secret
```

### Step 2: Verify Workflow File

The workflow file is already created at:
```
.github/workflows/deploy.yml
```

This file triggers automatically when you push to `master`.

### Step 3: Test Auto-Deployment

#### Manual Test (Recommended First)
1. Go to your GitHub repository
2. Click **Actions** (top navigation)
3. Click **Auto Deploy to VPS on Push to Master** (left sidebar)
4. Click **Run workflow** button
5. Select **master** branch
6. Click **Run workflow**

#### Automatic Deployment
Just push code to master:
```bash
git add -A
git commit -m "Deploy: New features"
git push origin master
```

### Step 4: Monitor Deployment

1. Go to repository **Actions** tab
2. Click the latest workflow run
3. Click **build-and-deploy** job
4. Watch the deployment progress

### Step 5: Access Application

Once deployment completes:
```
http://187.124.97.56:3000
```

---

## Workflow Details

### Trigger Events
- **Automatic:** Every push to `master` branch
- **Manual:** Click "Run workflow" in GitHub Actions

### Deployment Steps

```
1. Checkout code
   ↓
2. Set up Node.js 18
   ↓
3. Install dependencies (3 parts)
   ├─ Root dependencies
   ├─ Server dependencies
   └─ Client dependencies
   ↓
4. Build server
   ↓
5. Build client
   ↓
6. Connect to VPS via SSH
   ↓
7. Pull latest code
   ↓
8. Build on VPS
   ├─ Server build
   └─ Client build
   ↓
9. Copy client to web server
   ↓
10. Restart PM2 application
   ↓
11. Verify deployment
```

---

## GitHub Actions Secrets

### Required Secret
- **VPS_PASSWORD** = `Galaba@181123`

### Optional (for Docker deployment)
If you want Docker deployments in future:
- **DOCKER_USERNAME** = your docker hub username
- **DOCKER_PASSWORD** = your docker hub token

---

## Troubleshooting

### Workflow Not Triggering
**Problem:** Code pushed but workflow didn't run
**Solution:** 
1. Check branch name is exactly `master`
2. Wait 30 seconds, refresh page
3. Go to Actions tab and check "All workflows"

### "SSH connection refused"
**Problem:** VPS deployment failed
**Solution:**
1. Verify VPS SSH credentials in secret: `Galaba@181123`
2. Check if VPS is running: `ssh root@187.124.97.56`
3. Verify `/root/lms` exists on VPS

### "Permission denied" on file copy
**Problem:** Client build copy failed
**Solution:** 
1. Ensure `/var/www/html` exists on VPS
2. Ensure `root` user can write to it
3. It's optional, deployment continues anyway

### Build Failed
**Problem:** Npm install or build step failed
**Solution:**
1. Check Dependencies in GitHub Actions logs
2. Run locally: `npm install` and `npm run build`
3. Fix errors locally before pushing

### Deployment Logs

View live deployment logs:
1. Repository → Actions
2. Click the workflow run
3. Click **build-and-deploy**
4. Click **Deploy to VPS** step
5. Expand deployment script output

---

## Manual Override

If auto-deployment fails, deploy manually:

```bash
# Local Build
cd d:\Simple_CB_LMS\Codebegun\lms-saas
npm run build # (runs build for both server and client)

# Push to GitHub
git add -A
git commit -m "fix: deployment issue"
git push origin master

# Or SSH to VPS directly
ssh root@187.124.97.56
cd /root/lms
git pull origin master
cd server && npm install && npm run build && cd ..
cd client && npm install && npm run build && cd ..
pm2 restart lms-server
```

---

## Workflow Configuration File

Location: `.github/workflows/deploy.yml`

The workflow includes:
- ✅ Automatic trigger on master push
- ✅ Manual trigger option
- ✅ SSH password authentication (no SSH keys needed)
- ✅ NPM build and deployment
- ✅ PM2 application restart
- ✅ Success/failure notifications

---

## GitHub Actions Dashboard

**Quick Links:**
- Repository: https://github.com/mynameiscod/lms
- Actions: https://github.com/mynameiscod/lms/actions
- Secrets: https://github.com/mynameiscod/lms/settings/secrets/actions

---

## Deployment Status Badge

You can add this to your README.md to show deployment status:

```markdown
[![Deploy Status](https://github.com/mynameiscod/lms/workflows/Auto%20Deploy%20to%20VPS%20on%20Push%20to%20Master/badge.svg)](https://github.com/mynameiscod/lms/actions)
```

---

## FAQ

**Q: Will auto-deployment break the application if build fails?**
A: No, deployment stops if build fails. The running version stays active.

**Q: Can I disable auto-deployment?**
A: Yes, go to Actions → disable workflow. Or remove `.github/workflows/deploy.yml`.

**Q: How long does deployment take?**
A: Usually 2-5 minutes depending on build size.

**Q: Can I rollback if deployment goes wrong?**
A: Yes, push the previous working version. Or SSH and run `git checkout <commit-id>`.

**Q: Can I deploy branches other than master?**
A: Yes, edit `.github/workflows/deploy.yml` to add more branches.

**Q: Do I need to do anything manually?**
A: No! Just push to master and it deploys automatically.

---

## Summary

✅ GitHub Actions automatically deploys your app when you push to master
✅ No manual SSH commands needed
✅ One secret to configure: `VPS_PASSWORD`
✅ Deployment takes 2-5 minutes
✅ View progress in GitHub Actions tab
✅ Access app at http://187.124.97.56:3000

**Next Steps:**
1. ✅ Add `VPS_PASSWORD` secret to GitHub
2. ✅ Push code to master
3. ✅ Watch deployment in Actions tab
4. ✅ Access app when complete!
