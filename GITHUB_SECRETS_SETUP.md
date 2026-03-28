# GitHub Secrets Setup for CI/CD Pipeline

## Pipeline Overview

```
Push → Build & Test → Deploy DEV → Health Check → Deploy PROD
                                        ↓
                                   (Auto Rollback on Failure)
```

---

## Required Secrets

Go to your GitHub repository → **Settings** → **Secrets and variables** → **Actions**

### Development Environment Secrets

| Secret | Description | Example |
|--------|-------------|---------|
| `DEV_HOST` | Dev server IP address | `192.168.1.100` |
| `DEV_USER` | SSH username | `root` |
| `DEV_SSH_KEY` | SSH private key for dev | `-----BEGIN...` |

### Production Environment Secrets

| Secret | Description | Example |
|--------|-------------|---------|
| `PROD_HOST` | Production server IP | `187.124.97.56` |
| `PROD_USER` | SSH username | `root` |
| `PROD_SSH_KEY` | SSH private key for prod | `-----BEGIN...` |

### Legacy Secrets (Still Supported)

| Secret | Maps To |
|--------|---------|
| `VPS_HOST` | Same as `PROD_HOST` |
| `VPS_USER` | Same as `PROD_USER` |
| `VPS_SSH_KEY` | Same as `PROD_SSH_KEY` |

---

## Option 1: Same Server for Dev & Prod (Different Ports)

If using ONE server for both environments:

```
DEV_HOST = 187.124.97.56  (Port 5001)
PROD_HOST = 187.124.97.56 (Port 5000)
```

Set both to use the same SSH key.

---

## Option 2: Separate Servers (Recommended for Production)

```
DEV Server:  dev.codebegun.com  (192.168.x.x)
PROD Server: platform.codebegun.com (187.124.97.56)
```

---

## Setting Up SSH Keys
```bash
# On your local machine
ssh-keygen -t ed25519 -C "github-deploy"

# Copy public key to VPS
ssh-copy-id -i ~/.ssh/id_ed25519.pub root@your-vps-ip

# Copy private key content for GitHub secret
cat ~/.ssh/id_ed25519
```

Paste the ENTIRE content including:
```
-----BEGIN OPENSSH PRIVATE KEY-----
...
-----END OPENSSH PRIVATE KEY-----
```

### 4. VPS_PASSWORD (Optional - legacy)
Only needed if using password authentication instead of SSH key.

---

## Setting Up SSH Key on VPS

```bash
# On your VPS
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# Add your public key
echo "your-public-key-content" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

---

## Testing the Connection

```bash
# From your local machine
ssh -i ~/.ssh/id_ed25519 root@your-vps-ip
```

---

## Workflow Files

| Workflow | Purpose | Auto-Trigger |
|----------|---------|--------------|
| `ci-cd-pipeline.yml` | **Full Dev → Prod pipeline** | Push to master/develop |
| `safe-deploy.yml` | Direct deploy (backup) | Push to master |
| `deploy.yml.disabled` | Legacy (disabled) | - |

### CI/CD Pipeline Flow:
```
Push to any branch → Build & Test
        ↓
Push to develop/master → Deploy to DEV
        ↓
DEV health check passes → Deploy to PRODUCTION
        ↓
PROD health check fails → Auto Rollback
```

---

## Manual Deployment Trigger

1. Go to **Actions** tab
2. Click **"CI/CD Pipeline"**
3. Click **"Run workflow"**
4. Select environment:
   - `dev` - Deploy only to DEV
   - `production` - Deploy to PRODUCTION
   - `rollback-dev` - Rollback DEV
   - `rollback-prod` - Rollback PRODUCTION

---

## GitHub Environments (Optional but Recommended)

Setup approval gates for production:

1. Go to **Settings** → **Environments**
2. Create `development` environment
3. Create `production` environment
4. For `production`, add:
   - ✅ Required reviewers (yourself)
   - ✅ Wait timer (optional, e.g., 5 minutes)

This adds a manual approval step before production deployment.

---

## Quick Setup Commands

```bash
# Generate SSH key
ssh-keygen -t ed25519 -C "github-deploy-dev" -f ~/.ssh/github_dev
ssh-keygen -t ed25519 -C "github-deploy-prod" -f ~/.ssh/github_prod

# Copy to servers
ssh-copy-id -i ~/.ssh/github_dev.pub root@DEV_SERVER_IP
ssh-copy-id -i ~/.ssh/github_prod.pub root@PROD_SERVER_IP

# Get private keys for GitHub secrets
cat ~/.ssh/github_dev    # → DEV_SSH_KEY
cat ~/.ssh/github_prod   # → PROD_SSH_KEY
```

---

## Disabling Auto-Deploy

To deploy manually only:
```bash
mv .github/workflows/ci-cd-pipeline.yml .github/workflows/ci-cd-pipeline.yml.disabled
```
