# LMS SaaS Platform

A multi-tenant Learning Management System built with React, Node.js, and MongoDB.

## Quick Start

### Local Development
```bash
# Install dependencies
npm install
cd server && npm install
cd ../client && npm install

# Start development
cd server && npm run dev    # Backend on :5000
cd client && npm start      # Frontend on :3000
```

### Production Deployment
```bash
# On your VPS
git clone https://github.com/mynameiscod/lms.git /root/lms
cd /root/lms
cp server/.env.example server/.env
nano server/.env  # Add your config
docker-compose up -d
```

## Project Structure
```
├── client/          # React frontend
├── server/          # Node.js backend
├── shared/          # Shared types
├── scripts/         # Deployment scripts
│   ├── deploy.sh    # Deploy with backup
│   ├── backup.sh    # Manual backup
│   └── restore.sh   # Restore from backup
├── docs/            # Documentation
├── nginx/           # NGINX config
└── docker-compose.yml
```

## Deployment Commands

```bash
# Deploy (auto-backups before deploy)
./scripts/deploy.sh

# Manual backup
./scripts/backup.sh

# Restore from backup
./scripts/restore.sh 20260328_150000
```

## Documentation

See [docs/](docs/) folder for:
- Deployment guides
- Feature documentation
- Troubleshooting

## Tech Stack
- **Frontend**: React, TypeScript, Material-UI
- **Backend**: Node.js, Express, TypeScript
- **Database**: MongoDB
- **Deployment**: Docker, NGINX
