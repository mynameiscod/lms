# LMS SaaS - Learning Management System

A modern, scalable Learning Management System built with a **monorepo architecture**. Perfect for microservices expansion in the future.

## 📁 Project Structure

This is a **monorepo** managed with npm workspaces:

```
lms-saas/
├── client/              # React frontend (port 3000)
├── server/              # Express.js backend API (port 5000)
├── shared/              # Shared types, constants, utilities
├── services/            # (Future) Microservices directory
│   ├── notification-service/
│   ├── analytics-service/
│   └── ...
├── package.json         # Root workspace configuration
└── tsconfig.json        # TypeScript project references
```

## 🚀 Quick Start

### Prerequisites
- Node.js >= 16.0.0
- npm >= 8.0.0
- MongoDB (for database)

### Installation

```bash
# Install all dependencies for all workspaces
npm install
```

### Development

```bash
# Start all services
npm run dev

# OR start individual services
npm run dev:client    # Start frontend on port 3000
npm run dev:server    # Start backend on port 5000
```

### Build

```bash
# Build all workspaces
npm run build

# OR build specific workspace
npm run build:client
npm run build:server
```

## 📦 Workspaces

### Client (`/client`)
React TypeScript frontend application
- Port: 3000
- Frameworks: React 18, React Router, TypeScript, Socket.io
- Scripts:
  ```bash
  cd client
  npm start        # Start dev server
  npm run build    # Build for production
  npm test         # Run tests
  ```

### Server (`/server`)
Express.js TypeScript backend API
- Port: 5000
- Frameworks: Express, MongoDB, Mongoose, JWT, Socket.io
- Scripts:
  ```bash
  cd server
  npm run dev      # Start with ts-node
  npm run build    # Compile TypeScript
  npm start        # Run compiled version
  npm run seed     # Seed database
  ```

### Shared (`/shared`)
TypeScript types and constants shared across packages
- Used by: client, server, services
- Scripts:
  ```bash
  cd shared
  npm run dev      # Watch mode TypeScript compilation
  npm run build    # Build TypeScript
  ```

## 🔧 Configuration

### Environment Variables

Create `.env` file in root:
```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/lms_saas

# JWT
JWT_SECRET=your-secret-key

# Server
NODE_ENV=development
SERVER_PORT=5000

# Client
REACT_APP_API_URL=http://localhost:5000
```

### Docker

Run the entire stack with Docker:
```bash
docker-compose up
```

## 📚 Features

- Multi-tenant LMS system
- Course management
- Quiz system with monitoring
- Content management
- User enrollment
- Role-based access control (RBAC)
- Real-time updates with Socket.io
- TypeScript for type safety

## 🎯 Future - Microservices

This monorepo structure is ready for easy conversion to microservices:

```
services/
├── notification-service/    # Email, SMS, Push notifications
├── analytics-service/       # Analytics and reporting
├── reporting-service/       # Report generation
├── payment-service/         # Payment processing
└── export-service/         # Export to PDF, Excel, etc.
```

Each service can be:
- Independently deployed
- Scaled separately
- Developed by different teams
- Using different frameworks/languages

## 🤝 Development Workflow

1. **Create feature branch** from `dev` or `master`
   ```bash
   git checkout -b feature/your-feature
   ```

2. **Make changes** across one or more workspaces

3. **Test locally**
   ```bash
   npm run dev         # Run all services
   # or
   npm run dev:client  # Test frontend only
   npm run dev:server  # Test backend only
   ```

4. **Build and verify**
   ```bash
   npm run build
   ```

5. **Commit and push**
   ```bash
   git add .
   git commit -m "Description of changes"
   git push origin feature/your-feature
   ```

6. **Create Pull Request** to merge into main branch

## 🔐 Security

- JWT-based authentication
- Role-based authorization
- Environment variable protection
- Input validation and sanitization
- CORS configured for frontend

## 📝 API Documentation

API endpoints are available at `/api/v1/*`

- Authentication: `/api/v1/auth`
- Users: `/api/v1/users`
- Courses: `/api/v1/courses`
- Content: `/api/v1/content`
- Quizzes: `/api/v1/quizzes`
- Enrollments: `/api/v1/enrollments`

## 🐛 Troubleshooting

### Port already in use
```bash
# Kill process on port 3000
Get-NetTCPConnection -LocalPort 3000 | Stop-Process

# Kill process on port 5000
Get-NetTCPConnection -LocalPort 5000 | Stop-Process
```

### npm install issues
```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and package-lock.json
rm -r node_modules
rm package-lock.json

# Reinstall
npm install
```

## 📄 License

This project is licensed under the MIT License.

## 👥 Support

For issues, questions, or contributions, please contact the development team.
