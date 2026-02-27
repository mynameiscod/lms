# Learning Management System (LMS) SaaS

## Overview
This project is a multi-tenant Learning Management System (LMS) built using React for the frontend, Node.js for the backend, and MongoDB for the database. It is designed to support multiple tenants, allowing different organizations to use the same application while keeping their data isolated.

## Project Structure
The project is organized into three main directories:

- **client**: Contains the React frontend application.
- **server**: Contains the Node.js backend application.
- **shared**: Contains shared resources such as constants and types.

## Features
- Multi-tenant architecture
- User authentication and role-based access control
- Course management
- Enrollment management
- Dashboard for analytics and insights
- Settings management for tenants

## Getting Started

### Prerequisites
- Node.js
- MongoDB
- Docker (optional, for running with Docker)

### Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd lms-saas
   ```

2. Install dependencies for the client:
   ```
   cd client
   npm install
   ```

3. Install dependencies for the server:
   ```
   cd server
   npm install
   ```

4. (Optional) If using Docker, run:
   ```
   docker-compose up
   ```

### Running the Application

- To start the client:
  ```
  cd client
  npm start
  ```

- To start the server:
  ```
  cd server
  npm run dev
  ```

### Role Definitions
- **Admin**: Full access to manage users, courses, and settings.
- **Instructor**: Can create and manage courses and view enrollments.
- **Student**: Can enroll in courses and access course materials.

## Contributing
Contributions are welcome! Please open an issue or submit a pull request for any enhancements or bug fixes.

## License
This project is licensed under the MIT License. See the LICENSE file for details.