# Attendance System Setup Guide

## Overview
Complete attendance management system for LMS platform with roles, permissions, marking, and reporting features.

## Features Implemented

### 1. **Backend**
- ✅ Attendance Model with MongoDB schema
- ✅ Attendance Service with full CRUD operations
- ✅ Attendance Controller with request handlers
- ✅ Attendance Routes with authentication and authorization
- ✅ Multi-tenant support with tenant isolation

### 2. **Frontend**
- ✅ Attendance Marking Page (for ATTENDANCE_ADMIN)
  - Select batch and date
  - Mark attendance with in-time/out-time
  - Quick action buttons (P/A/L)
  - Batch-level summary
  
- ✅ My Attendance Page (for all users)
  - View own attendance records
  - Filter by date range and batch
  - Attendance summary statistics
  
- ✅ Attendance Reports Page (for ATTENDANCE_ADMIN)
  - Batch-level attendance overview
  - Student-level detailed view
  - Attendance distribution charts
  - CSV export functionality

### 3. **Navigation**
- ✅ Added to Sidebar with role-based access
  - "Mark Attendance" - ATTENDANCE_ADMIN, TENANT_ADMIN, SUPER_ADMIN
  - "My Attendance" - All authenticated users
  - "Attendance Reports" - ATTENDANCE_ADMIN, TENANT_ADMIN, SUPER_ADMIN

## Setup Instructions

### Step 1: Create ATTENDANCE_ADMIN Role
1. Go to `/roles` page in your LMS
2. Click "Create Role"
3. Fill in the form:
   - **Role Name:** ATTENDANCE_ADMIN
   - **Permissions:** Select the following:
     - ✅ mark_attendance
4. Click "Create Role"

### Step 2: Assign ATTENDANCE_ADMIN Role to Users
1. Go to `/users` page
2. Find the user who should mark attendance
3. Click "Edit Role"
4. Select "ATTENDANCE_ADMIN" role
5. Save changes

### Step 3: Marking Attendance
1. User with ATTENDANCE_ADMIN role goes to `/attendance`
2. Select a batch
3. Select a date (current or past)
4. Quick actions available:
   - **P (Present):** Mark student present, enable in/out time fields
   - **A (Absent):** Mark student absent
   - **L (Leave):** Mark student on leave
5. Optionally enter in-time and out-time (HH:MM format)
6. Click "Submit Attendance" to save

### Step 4: Viewing Attendance
**As a Student:**
1. Go to `/my-attendance`
2. Select batch (optional)
3. Choose date range
4. Click "Filter"
5. View attendance records with summary stats

**As an Admin:**
1. Go to `/attendance-reports`
2. Select a batch
3. View batch overview with statistics
4. Scroll down to see all students with:
   - Total days
   - Present/Absent/Leave counts
   - Attendance percentage with color-coded bars
5. Click "Export to CSV" to download report

## API Endpoints

### Attendance Endpoints
- `POST /api/v1/attendance` - Mark attendance
- `GET /api/v1/attendance/student/:studentId` - Get student attendance
- `GET /api/v1/attendance/batch/:batchId/date` - Get batch attendance for specific date
- `GET /api/v1/attendance/batch/:batchId/summary` - Get batch attendance summary
- `GET /api/v1/attendance/student/:studentId/summary` - Get student attendance summary
- `GET /api/v1/attendance/range` - Get attendance by date range
- `DELETE /api/v1/attendance/:attendanceId` - Delete attendance record

### Query Parameters
- `startDate` (YYYY-MM-DD): For filtering by date range
- `endDate` (YYYY-MM-DD): For filtering by date range
- `batchId`: For filtering by batch

## Database Schema

### Attendance Model
```typescript
{
  _id: ObjectId,
  studentId: ObjectId (ref: User),
  batchId: ObjectId (ref: Batch),
  date: Date,
  inTime: String (HH:MM),
  outTime: String (HH:MM),
  status: 'present' | 'absent' | 'leave',
  markedBy: ObjectId (ref: User),
  tenantId: ObjectId (ref: Tenant),
  remarks: String (optional),
  createdAt: Date,
  updatedAt: Date
}
```

## File Structure

### Backend
```
server/src/
├── models/
│   └── Attendance.ts          # MongoDB schema
├── services/
│   └── attendanceService.ts   # Business logic
├── controllers/
│   └── attendanceController.ts # Request handlers
└── routes/
    └── attendanceRoutes.ts     # API routes
```

### Frontend
```
client/src/
├── pages/
│   ├── Attendance/
│   │   ├── index.tsx           # Attendance marking page
│   │   └── AttendancePage.css
│   ├── MyAttendance/
│   │   ├── index.tsx           # My attendance view
│   │   └── MyAttendancePage.css
│   └── AttendanceReports/
│       ├── index.tsx           # Reports page
│       └── AttendanceReportsPage.css
├── api/
│   └── index.ts               # attendanceApi functions
└── types/
    └── index.ts               # Attendance types
```

## Attendance States

- **Present (P)**: Student appeared with in-time and out-time
- **Absent (A)**: Student did not appear
- **Leave (L)**: Student is on approved leave

## Attendance Percentage Calculation

```
Attendance % = (Present Days / Total Days) × 100
```

**Classification:**
- 🟢 Excellent: ≥ 75%
- 🟡 Good: 60% - 74%
- 🟠 Average: 45% - 59%
- 🔴 Poor: < 45%

## Permissions System

The attendance system uses the following permission:
- `mark_attendance` - Ability to mark and manage attendance records

This permission is required for:
- Marking attendance
- Accessing attendance reports
- Deleting attendance records

## Multi-tenant Support

- Each attendance record is tied to a specific tenant
- Users can only see attendance for their own tenant
- Batch isolation ensures data privacy between tenants
- All queries automatically filter by tenantId

## Notes

1. **Attendance History**: All attendance records are permanent and timestamped
2. **In/Out Times**: These times are only relevant when status is "present"
3. **Date Format**: Dates are stored as full dates (YYYY-MM-DD at 00:00:00)
4. **CSV Export**: Export includes all visible students and their attendance data
5. **Search**: Reports can be filtered by date range and batch

## Troubleshooting

### Users can't see attendance options
- Check if user has ATTENDANCE_ADMIN role assigned
- Verify mark_attendance permission is in the role

### Can't mark attendance for a batch
- Ensure the batch exists and is active
- Check if students exist in the system

### Attendance percentage seems wrong
- Verify the calculation: (present / total) × 100
- Check if date range filter is correct

## Future Enhancements

Potential features to add:
- [ ] Late arrival tracking
- [ ] Attendance notifications
- [ ] Parent/Guardian notifications
- [ ] Attendance analytics dashboard
- [ ] Automated attendance (QR code, biometric)
- [ ] Holiday calendar integration
- [ ] Leave approval workflow
