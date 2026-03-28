# GitHub Secrets Setup for Auto-Deployment

## Required Secrets

Go to your GitHub repository → **Settings** → **Secrets and variables** → **Actions**

Add these secrets:

### 1. VPS_HOST
Your VPS IP address
```
187.124.97.56
```

### 2. VPS_USER  
SSH username (usually root)
```
root
```

### 3. VPS_SSH_KEY
Your SSH private key for authentication.

**Generate SSH key (if you don't have one):**
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

- **`.github/workflows/safe-deploy.yml`** - Main deployment workflow (recommended)
- **`.github/workflows/deploy.yml`** - Legacy workflow (disabled)

The safe-deploy workflow:
1. ✅ Builds and tests code first
2. ✅ Creates backup before deploying  
3. ✅ Preserves .env files
4. ✅ Has automatic rollback on failure
5. ✅ Supports manual rollback trigger

---

## Manual Deployment Trigger

1. Go to **Actions** tab
2. Click **"Safe Deploy to VPS"**
3. Click **"Run workflow"**
4. Select deployment type:
   - `normal` - Standard deployment
   - `force` - Force rebuild
   - `rollback` - Rollback to previous version

---

## Disabling Auto-Deploy

To deploy manually only, rename the workflow file:
```bash
mv .github/workflows/safe-deploy.yml .github/workflows/safe-deploy.yml.disabled
```
