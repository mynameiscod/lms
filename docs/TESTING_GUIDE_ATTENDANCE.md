# Attendance System - Automation Testing Guide

**Date:** March 1, 2026

## Overview

This document provides comprehensive automation testing for the Attendance System covering both **Admin** and **Student** functionalities. The tests are organized into:

1. **Backend Unit Tests** - Attendance Controller
2. **Backend Service Tests** - Business Logic
3. **Backend Integration Tests** - API Endpoints
4. **Frontend Component Tests** - React Components
5. **End-to-End Tests** - Complete User Workflows

---

## Project Structure

```
lms-saas/
├── server/
│   └── src/
│       └── tests/
│           ├── attendance.controller.test.ts
│           ├── attendance.service.test.ts
│           └── attendance.integration.test.ts
├── client/
│   ├── cypress/
│   │   └── e2e/
│   │       └── attendance.cy.ts
│   └── src/
│       └── tests/
│           ├── AttendancePage.test.tsx
│           ├── MyAttendancePage.test.tsx
│           └── AttendanceReportsPage.test.tsx
```

---

## Setup Instructions

### Backend Testing Setup

#### 1. Install Testing Dependencies

```bash
cd server
npm install --save-dev jest @types/jest ts-jest supertest @types/supertest
```

#### 2. Configure Jest (server/jest.config.js)

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/server.ts'
  ]
};
```

#### 3. Add Test Script to server/package.json

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

### Frontend Testing Setup

#### 1. Cypress Installation

```bash
cd client
npm install --save-dev cypress @cypress/schematic
npx cypress install
```

#### 2. Create Cypress Config (client/cypress.config.ts)

```typescript
import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    setupNodeEvents(on, config) {
      // implement node event listeners here
    }
  }
});
```

#### 3. Add Test Scripts to client/package.json

```json
{
  "scripts": {
    "test": "react-scripts test",
    "cypress:open": "cypress open",
    "cypress:run": "cypress run",
    "e2e": "cypress run"
  }
}
```

---

## Running Tests

### Backend Tests

#### Run All Backend Tests

```bash
cd server
npm test
```

#### Run Specific Test File

```bash
npm test -- --testPathPattern=attendance.controller
npm test -- --testPathPattern=attendance.service
npm test -- --testPathPattern=attendance.integration
```

#### Run with Coverage

```bash
npm run test:coverage
```

#### Watch Mode (Auto-rerun on changes)

```bash
npm run test:watch
```

### Frontend Tests

#### Run Component Tests

```bash
cd client
npm test
```

#### Run Specific Component Tests

```bash
npm test -- AttendancePage.test
npm test -- MyAttendancePage.test
npm test -- AttendanceReportsPage.test
```

### End-to-End Tests

#### Open Cypress Test Runner (Interactive)

```bash
cd client
npm run cypress:open
```

#### Run Cypress in Headless Mode

```bash
npm run cypress:run
```

#### Run Specific E2E Test Suite

```bash
npx cypress run --spec "cypress/e2e/attendance.cy.ts"
```

---

## Test Coverage Details

### 1. Backend Unit Tests: Attendance Controller

**File:** `server/src/tests/attendance.controller.test.ts`

**Tests Covered:**

#### markAttendance()
- ✅ Mark attendance successfully with valid data
- ✅ Mark student as present, absent, or leave
- ✅ Return 400 for missing required fields
- ✅ Return 400 for invalid status
- ✅ Handle service errors with proper error response

**Total Test Cases: 6**

#### getStudentAttendance()
- ✅ Fetch student attendance successfully
- ✅ Fetch with date range filters
- ✅ Return empty array when no records found

**Total Test Cases: 3**

#### getBatchAttendance()
- ✅ Fetch batch attendance for specific date
- ✅ Handle missing date parameter

**Total Test Cases: 2**

#### getBatchAttendanceSummary()
- ✅ Fetch batch attendance summary with statistics

**Total Test Cases: 1**

#### getStudentAttendanceSummary()
- ✅ Fetch student attendance summary

**Total Test Cases: 1**

#### deleteAttendance()
- ✅ Delete attendance record successfully
- ✅ Return 404 when attendance not found

**Total Test Cases: 2**

**Total Controller Tests: 15**

---

### 2. Backend Service Tests: Attendance Service

**File:** `server/src/tests/attendance.service.test.ts`

**Tests Covered:**

#### markAttendance()
- ✅ Create or update attendance record
- ✅ Mark as absent without time entries
- ✅ Validate in-time and out-time format

**Total Test Cases: 3**

#### getStudentAttendance()
- ✅ Fetch all student attendance records
- ✅ Fetch with date range filter
- ✅ Return empty array for student with no records

**Total Test Cases: 3**

#### getBatchAttendance()
- ✅ Fetch batch attendance for specific date
- ✅ Fetch without date parameter

**Total Test Cases: 2**

#### getBatchAttendanceSummary()
- ✅ Calculate batch attendance statistics
- ✅ Calculate attendance percentage correctly

**Total Test Cases: 2**

#### getStudentAttendanceSummary()
- ✅ Calculate student attendance statistics

**Total Test Cases: 1**

#### getAttendanceByDateRange()
- ✅ Fetch attendance within date range
- ✅ Exclude records outside date range

**Total Test Cases: 2**

#### deleteAttendance()
- ✅ Delete by ID
- ✅ Handle deletion of non-existent record

**Total Test Cases: 2**

#### updateAttendance()
- ✅ Update attendance record

**Total Test Cases: 1**

#### Validation Tests
- ✅ Validate status values
- ✅ Validate time format (HH:MM)
- ✅ Validate date format

**Total Test Cases: 3**

**Total Service Tests: 19**

---

### 3. Backend Integration Tests

**File:** `server/src/tests/attendance.integration.test.ts`

**Setup:**
- Creates test tenant
- Creates admin and student users
- Creates batch
- Generates JWT tokens
- Cleanup after tests

**Tests Covered:**

#### POST /api/v1/attendance - Mark Attendance

- ✅ Mark attendance successfully with admin token
- ✅ Mark student as absent
- ✅ Mark student as on leave with remarks
- ✅ Return 400 for missing required fields
- ✅ Return 400 for invalid status
- ✅ Reject from non-admin user (401)
- ✅ Reject without authentication token (401)

**Total: 7 tests**

#### GET /api/v1/attendance/student/:studentId

- ✅ Fetch student attendance as admin
- ✅ Fetch with date range filter
- ✅ Allow student to view own attendance
- ✅ Return 404 for non-existent student

**Total: 4 tests**

#### GET /api/v1/attendance/batch/:batchId/date

- ✅ Fetch batch attendance for specific date
- ✅ Return attendance without date filter

**Total: 2 tests**

#### GET /api/v1/attendance/batch/:batchId/summary

- ✅ Fetch batch summary with statistics
- ✅ Reject summary request from non-admin (403)

**Total: 2 tests**

#### GET /api/v1/attendance/student/:studentId/summary

- ✅ Fetch student attendance summary
- ✅ Allow student to view own summary

**Total: 2 tests**

#### GET /api/v1/attendance/range

- ✅ Fetch attendance within date range

**Total: 1 test**

#### DELETE /api/v1/attendance/:attendanceId

- ✅ Delete as admin
- ✅ Return 404 for non-existent
- ✅ Reject from non-admin (403)

**Total: 3 tests**

#### Statistics Validation

- ✅ Calculate attendance percentage correctly
- ✅ Ensure sum of statuses equals total

**Total: 2 tests**

**Total Integration Tests: 23**

---

### 4. Frontend Component Tests

#### AttendancePage.test.tsx - Admin Attendance Marking

**Tests Covered:**

- ✅ Render page with title
- ✅ Load and display batches on mount
- ✅ Display date input field
- ✅ Load students when batch is selected
- ✅ Mark student as present with P button
- ✅ Mark student as absent with A button
- ✅ Mark student as leave with L button
- ✅ Allow entering in-time for present students
- ✅ Submit attendance for multiple students
- ✅ Display error on submission failure
- ✅ Display success message after submission
- ✅ Show loading state while fetching batches
- ✅ Handle batch selection change

**Total Test Cases: 13**

#### MyAttendancePage.test.tsx - Student Attendance View

**Tests Covered:**

- ✅ Render page with title
- ✅ Load and display attendance records
- ✅ Display attendance status with color coding
- ✅ Display attendance summary statistics
- ✅ Display attendance percentage
- ✅ Filter by batch
- ✅ Filter by date range
- ✅ Update when date range filter applied
- ✅ Display error on fetch failure
- ✅ Show loading state
- ✅ Display present attendance with green indicator
- ✅ Display absent attendance with red indicator
- ✅ Display leave attendance with yellow indicator
- ✅ Display remarks for leave entries
- ✅ Support pagination
- ✅ Display percentage color coding

**Total Test Cases: 16**

#### AttendanceReportsPage.test.tsx - Admin Attendance Reports

**Tests Covered:**

- ✅ Render page with title
- ✅ Load and display batch list
- ✅ Load batch report when batch selected
- ✅ Display batch level statistics
- ✅ Display batch attendance percentage
- ✅ Display student level breakdown
- ✅ Display individual student attendance percentage
- ✅ Display percentage bars with color coding
- ✅ Allow exporting to CSV
- ✅ Display student details in table format
- ✅ Handle batch selection change
- ✅ Show loading state
- ✅ Display error on fetch failure
- ✅ Display color-coded attendance status
- ✅ Display batch overview card
- ✅ Support sorting by column
- ✅ Display date range filters

**Total Test Cases: 17**

**Total Frontend Component Tests: 46**

---

### 5. End-to-End Tests (Cypress)

**File:** `client/cypress/e2e/attendance.cy.ts`

#### Admin Attendance Marking Workflow

- ✅ Navigate to attendance marking page
- ✅ Select batch and display students
- ✅ Mark multiple students as present
- ✅ Mark students with different statuses (P/A/L)
- ✅ Add in-time and out-time for present students
- ✅ Add remarks for leave entries
- ✅ Submit attendance for all students
- ✅ Change attendance date
- ✅ Switch between batches
- ✅ Display batch summary statistics
- ✅ Handle form submission errors

**Total: 11 tests**

#### Student Attendance View Workflow

- ✅ Navigate to my attendance page
- ✅ Load and display attendance records
- ✅ Display attendance status with color coding
- ✅ Display attendance summary statistics
- ✅ Display attendance percentage
- ✅ Filter by date range
- ✅ Filter by batch
- ✅ Display date in each row
- ✅ Display status in each row
- ✅ Display in-time if present
- ✅ Handle empty attendance data

**Total: 11 tests**

#### Admin Attendance Reports Workflow

- ✅ Navigate to reports page
- ✅ Display batch list for selection
- ✅ Load batch report when selected
- ✅ Display batch level statistics
- ✅ Display student details in table
- ✅ Display student attendance percentage with colors
- ✅ Export report to CSV
- ✅ Sort student data by column
- ✅ Switch between batches
- ✅ Display high attendance in green (>=80%)
- ✅ Display medium attendance in yellow (60-80%)
- ✅ Display low attendance in red (<60%)

**Total: 12 tests**

#### Role-Based Access Control

- ✅ Admin can access attendance marking page
- ✅ Student cannot access marking page
- ✅ Student can access my attendance page
- ✅ Admin can access reports page
- ✅ Student cannot access reports page

**Total: 5 tests**

**Total E2E Tests: 39**

---

## Test Execution Summary

| Test Type | File | Count | Command |
|-----------|------|-------|---------|
| **Backend** | | | |
| Unit - Controller | attendance.controller.test.ts | 15 | `npm test -- attendance.controller` |
| Service | attendance.service.test.ts | 19 | `npm test -- attendance.service` |
| Integration | attendance.integration.test.ts | 23 | `npm test -- attendance.integration` |
| **Frontend** | | | |
| Component 1 | AttendancePage.test.tsx | 13 | `npm test -- AttendancePage` |
| Component 2 | MyAttendancePage.test.tsx | 16 | `npm test -- MyAttendancePage` |
| Component 3 | AttendanceReportsPage.test.tsx | 17 | `npm test -- AttendanceReportsPage` |
| **E2E** | | | |
| Cypress | attendance.cy.ts | 39 | `npm run cypress:run` |
| **TOTAL** | | **142** | |

---

## Test Execution Flow

### 1. Run All Backend Tests

```bash
cd server
npm test
```

**Expected Output:**
- ✅ attendance.controller.test.ts - 15 tests passed
- ✅ attendance.service.test.ts - 19 tests passed
- ✅ attendance.integration.test.ts - 23 tests passed

### 2. Run All Frontend Tests

```bash
cd client
npm test -- --watchAll=false
```

**Expected Output:**
- ✅ AttendancePage.test.tsx - 13 tests passed
- ✅ MyAttendancePage.test.tsx - 16 tests passed
- ✅ AttendanceReportsPage.test.tsx - 17 tests passed

### 3. Run E2E Tests

```bash
cd client
npm run cypress:run
```

**Expected Output:**
- ✅ Admin Attendance Marking Workflow - 11 tests passed
- ✅ Student Attendance View Workflow - 11 tests passed
- ✅ Admin Reports Workflow - 12 tests passed
- ✅ Role-Based Access - 5 tests passed

---

## Continuous Integration Setup

### GitHub Actions Workflow (.github/workflows/attendance-tests.yml)

```yaml
name: Attendance System Tests

on: [push, pull_request]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '16'
      - run: cd server && npm install && npm test

  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '16'
      - run: cd client && npm install && npm test -- --watchAll=false

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '16'
      - run: cd server && npm install && npm run dev &
      - run: cd client && npm install && npm start &
      - run: sleep 10
      - run: cd client && npm run cypress:run
```

---

## Test Metrics

### Code Coverage Target

- **Controllers:** 80%+ line coverage
- **Services:** 85%+ line coverage
- **Components:** 75%+ line coverage
- **Overall:** 75%+ average coverage

### Generate Coverage Report

```bash
cd server
npm run test:coverage

cd client
npm test -- --coverage --watchAll=false
```

---

## Troubleshooting

### Common Issues

#### 1. Tests timeout in integration tests

**Solution:** Increase timeout in jest.config.js
```javascript
testTimeout: 10000 // 10 seconds
```

#### 2. MongoDB connection errors

**Solution:** Ensure MongoDB is running
```bash
# Start MongoDB locally
mongod

# Or use in-memory MongoDB for testing
npm install --save-dev mongodb-memory-server
```

#### 3. Cypress tests not finding elements

**Solution:** Increase wait time in cypress.config.ts
```typescript
defaultCommandTimeout: 5000,
requestTimeout: 5000,
responseTimeout: 5000
```

#### 4. Port already in use

**Solution:** Change ports in test configuration or kill existing processes
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Unix
lsof -ti:3000 | xargs kill -9
```

---

## Best Practices

1. **Write tests alongside code** - TDD approach
2. **Use meaningful test names** - Describe what is being tested
3. **Keep tests isolated** - Each test should be independent
4. **Mock external dependencies** - Don't rely on external APIs
5. **Test edge cases** - Handle errors and boundary conditions
6. **Maintain test data** - Keep fixtures and mocks updated
7. **Review coverage reports** - Identify untested code paths
8. **Run tests before committing** - Ensure all tests pass

---

## Additional Resources

- [Jest Documentation](https://jestjs.io/)
- [React Testing Library](https://testing-library.com/react)
- [Cypress Documentation](https://docs.cypress.io/)
- [SuperTest API Testing](https://github.com/visionmedia/supertest)

---

## Support & Maintenance

For issues or questions about the test suite:
1. Check existing test files for similar scenarios
2. Review error messages carefully
3. Consult team documentation
4. Add new tests for bug fixes

**Last Updated:** March 1, 2026
