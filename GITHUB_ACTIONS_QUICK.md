# GitHub Actions Auto-Deployment - Quick Setup

## ⚡ 3-Minute Setup

### Step 1: Add Secret (1 minute)
1. Go: https://github.com/mynameiscod/lms/settings/secrets/actions
2. Click **New repository secret**
3. Name: `VPS_PASSWORD`
4. Value: `Galaba@181123`
5. Click **Add secret**

✅ Done! Auto-deployment is now ready.

---

## 🚀 How to Deploy

### Option A: Automatic (Easiest)
Just push code to master:
```bash
git add -A
git commit -m "New feature"
git push origin master
```
✨ App automatically deploys in 2-5 minutes!

### Option B: Manual Trigger
1. Go: https://github.com/mynameiscod/lms/actions
2. Click **Auto Deploy to VPS on Push to Master**
3. Click **Run workflow**
4. Select **master**
5. Click **Run workflow**

---

## 📊 Monitor Deployment

1. Go to: https://github.com/mynameiscod/lms/actions
2. Click the latest workflow run
3. Watch the steps execute
4. See deployment progress in real-time

---

## ✅ When Deployment Completes

Access your app:
```
http://187.124.97.56:3000
```

---

## 📋 What It Does Automatically

1. ✅ Checks out code
2. ✅ Installs dependencies
3. ✅ Builds server (TypeScript → JavaScript)
4. ✅ Builds client (React production build)
5. ✅ Connects to VPS
6. ✅ Pulls latest code on VPS
7. ✅ Builds on VPS
8. ✅ Restarts PM2 application
9. ✅ App is live!

---

## ⏱️ Deployment Timeline

- **GitHub Build**: ~1-2 minutes
- **VPS Deployment**: ~1-3 minutes
- **Total**: ~2-5 minutes

---

## 🆘 Troubleshooting

| Problem | Solution |
|---------|----------|
| Workflow not running | Check branch name is `master` |
| SSH connection error | Verify `VPS_PASSWORD` secret is correct |
| Build failed | Check logs, fix locally, push again |
| App not updating | Wait 5 minutes and refresh browser |

---

## 📚 Full Setup Guide

For detailed instructions, see: `GITHUB_ACTIONS_SETUP.md`

---

## ✨ Summary

- Setup: Add 1 secret
- Deploy: Push to master
- Time: 2-5 minutes
- Access: http://187.124.97.56:3000

**That's it! You're done.** 🎉
