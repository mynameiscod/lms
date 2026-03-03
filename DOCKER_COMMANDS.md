# Docker Deployment Commands

## Option 1: Using Docker Compose (EASIEST)

### Build and Run All Services

```bash
cd d:\Simple_CB_LMS\Codebegun\lms-saas

# Build all images
docker-compose build

# Start all services
docker-compose up -d
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f server
docker-compose logs -f client
docker-compose logs -f mongodb
```

### Stop All Services
```bash
docker-compose down
```

### Remove Everything (including volumes)
```bash
docker-compose down -v
```

---

## Option 2: Using Individual Docker Run Commands

### 1. Start MongoDB
```bash
docker run -d \
  --name lms-mongodb \
  -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=password123 \
  -e MONGO_INITDB_DATABASE=lms-saas \
  -v mongodb_data:/data/db \
  mongo:latest
```

### 2. Build Server Image
```bash
cd d:\Simple_CB_LMS\Codebegun\lms-saas\server
docker build -t lms-server:latest .
```

### 3. Run Server Container
```bash
docker run -d \
  --name lms-server \
  -p 5000:5000 \
  -e MONGODB_URI=mongodb://admin:password123@lms-mongodb:27017/lms-saas?authSource=admin \
  -e JWT_SECRET=your-secret-key-change-this \
  -e NODE_ENV=production \
  --link lms-mongodb:mongodb \
  lms-server:latest
```

### 4. Build Client Image
```bash
cd d:\Simple_CB_LMS\Codebegun\lms-saas\client
docker build -t lms-client:latest .
```

### 5. Run Client Container
```bash
docker run -d \
  --name lms-client \
  -p 3000:3000 \
  -e REACT_APP_API_URL=http://localhost:5000/api/v1 \
  --link lms-server:server \
  lms-client:latest
```

---

## Option 3: Using Network (Recommended for Production)

### Create Network
```bash
docker network create lms-network
```

### Run MongoDB
```bash
docker run -d \
  --name lms-mongodb \
  --network lms-network \
  -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=password123 \
  -e MONGO_INITDB_DATABASE=lms-saas \
  -v mongodb_data:/data/db \
  mongo:latest
```

### Run Server
```bash
docker run -d \
  --name lms-server \
  --network lms-network \
  -p 5000:5000 \
  -e MONGODB_URI=mongodb://admin:password123@lms-mongodb:27017/lms-saas?authSource=admin \
  -e JWT_SECRET=your-secret-key \
  -e NODE_ENV=production \
  lms-server:latest
```

### Run Client
```bash
docker run -d \
  --name lms-client \
  --network lms-network \
  -p 3000:3000 \
  -e REACT_APP_API_URL=http://lms-server:5000/api/v1 \
  lms-client:latest
```

---

## Deploy to VPS with Docker

### 1. SSH into VPS
```bash
ssh root@187.124.97.56
# Password: Galaba@181123
```

### 2. Install Docker
```bash
# Update system
apt-get update
apt-get upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version
```

### 3. Clone/Pull Code
```bash
cd /root
git clone https://github.com/mynameiscod/lms.git lms
cd lms
git pull origin master
```

### 4. Build and Deploy
```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# View logs
docker-compose logs -f
```

### 5. Access Application
```
http://187.124.97.56:3000
```

---

## Useful Docker Commands

### View Running Containers
```bash
docker ps
```

### View All Containers
```bash
docker ps -a
```

### Stop Container
```bash
docker stop lms-server
docker stop lms-client
docker stop lms-mongodb
```

### Start Container
```bash
docker start lms-server
docker start lms-client
docker start lms-mongodb
```

### Remove Container
```bash
docker rm lms-server
# Force remove if running
docker rm -f lms-server
```

### View Container Logs
```bash
docker logs lms-server
docker logs -f lms-server  # Follow logs (real-time)
docker logs --tail 100 lms-server  # Last 100 lines
```

### Execute Command in Container
```bash
docker exec -it lms-server bash
```

### Remove Image
```bash
docker rmi lms-server:latest
```

### Prune (Clean Up)
```bash
# Remove unused images
docker image prune -a

# Remove unused containers
docker container prune

# Remove unused volumes
docker volume prune

# Remove everything
docker system prune -a --volumes
```

---

## Docker Compose Management

### Start Services
```bash
docker-compose up -d
```

### Stop Services
```bash
docker-compose stop
```

### Restart Services
```bash
docker-compose restart
```

### Rebuild Services
```bash
docker-compose build --no-cache
docker-compose up -d
```

### View Service Status
```bash
docker-compose ps
```

---

## Environment Variables

Create `.env` file in project root:
```
JWT_SECRET=your-secret-key-here
MONGODB_URI=mongodb://admin:password123@mongodb:27017/lms-saas
NODE_ENV=production
REACT_APP_API_URL=http://localhost:5000/api/v1
```

---

## Push to Docker Hub (Optional)

### Login
```bash
docker login
```

### Tag Image
```bash
docker tag lms-server:latest yourusername/lms-server:latest
docker tag lms-client:latest yourusername/lms-client:latest
```

### Push
```bash
docker push yourusername/lms-server:latest
docker push yourusername/lms-client:latest
```

---

## Quick Start Summary

**Local Development:**
```bash
cd d:\Simple_CB_LMS\Codebegun\lms-saas
docker-compose build
docker-compose up -d
# Access: http://localhost:3000
```

**VPS Production:**
```bash
ssh root@187.124.97.56
cd /root/lms
docker-compose up -d
# Access: http://187.124.97.56:3000
```
