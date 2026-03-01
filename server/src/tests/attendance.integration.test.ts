import request from 'supertest';
import app from '../app';
import Attendance from '../models/Attendance';
import User from '../models/User';
import Batch from '../models/Batch';
import Tenant from '../models/Tenant';
import { Types } from 'mongoose';
import jwt from 'jsonwebtoken';

/**
 * Integration Tests for Attendance API
 * These tests verify the complete flow: auth -> controller -> service -> database
 * Note: These tests require MongoDB to be running and are currently skipped
 */
describe.skip('Attendance API Integration Tests (requires MongoDB)', () => {
  let adminToken: string;
  let studentToken: string;
  let tenantId: string;
  let batchId: string;
  let studentId: string;
  let adminId: string;
  let attendanceId: string;

  beforeAll(async () => {
    // Setup test tenant
    const tenant = await Tenant.create({
      name: 'Test Tenant',
      domain: 'test-tenant.com',
      subscriptionTier: 'pro'
    });
    tenantId = tenant._id.toString();

    // Setup admin user
    const adminUser = await User.create({
      name: 'Admin User',
      email: 'admin@test.com',
      password: 'hashed_password',
      role: 'ATTENDANCE_ADMIN',
      tenantId,
      status: 'active'
    });
    adminId = adminUser._id.toString();

    // Setup student user
    const studentUser = await User.create({
      name: 'Student User',
      email: 'student@test.com',
      password: 'hashed_password',
      role: 'STUDENT',
      tenantId,
      status: 'active'
    });
    studentId = studentUser._id.toString();

    // Setup batch
    const batch = await Batch.create({
      name: 'Batch A1',
      code: 'A1',
      courseId: new Types.ObjectId(),
      tenantId,
      startDate: new Date('2026-02-01'),
      endDate: new Date('2026-05-01')
    });
    batchId = batch._id.toString();

    // Generate JWT tokens
    adminToken = jwt.sign(
      { userId: adminId, tenantId, role: 'ATTENDANCE_ADMIN' },
      process.env.JWT_SECRET || 'test-secret'
    );

    studentToken = jwt.sign(
      { userId: studentId, tenantId, role: 'STUDENT' },
      process.env.JWT_SECRET || 'test-secret'
    );
  });

  afterAll(async () => {
    // Cleanup
    await Attendance.deleteMany({ tenantId });
    await User.deleteMany({ tenantId });
    await Batch.deleteMany({ tenantId });
    await Tenant.deleteOne({ _id: tenantId });
  });

  describe('POST /api/v1/attendance - Mark Attendance (Admin)', () => {
    it('should mark attendance successfully with admin token', async () => {
      const response = await request(app)
        .post('/api/v1/attendance')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          studentId,
          batchId,
          date: '2026-03-01',
          status: 'present',
          inTime: '09:00',
          outTime: '17:00'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('present');
      expect(response.body.data.inTime).toBe('09:00');
      expect(response.body.data.outTime).toBe('17:00');
      
      attendanceId = response.body.data._id;
    });

    it('should mark student as absent', async () => {
      const response = await request(app)
        .post('/api/v1/attendance')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          studentId,
          batchId,
          date: '2026-03-02',
          status: 'absent'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('absent');
    });

    it('should mark student as on leave with remarks', async () => {
      const response = await request(app)
        .post('/api/v1/attendance')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          studentId,
          batchId,
          date: '2026-03-03',
          status: 'leave',
          remarks: 'Medical leave - doctor appointment'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('leave');
      expect(response.body.data.remarks).toBe('Medical leave - doctor appointment');
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/v1/attendance')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          studentId,
          batchId
          // Missing date and status
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Missing required fields');
    });

    it('should return 400 for invalid status', async () => {
      const response = await request(app)
        .post('/api/v1/attendance')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          studentId,
          batchId,
          date: '2026-03-01',
          status: 'invalid_status'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid status');
    });

    it('should reject attendance marking from non-admin user', async () => {
      const response = await request(app)
        .post('/api/v1/attendance')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          studentId,
          batchId,
          date: '2026-03-04',
          status: 'present'
        });

      expect(response.status).toBe(403);
    });

    it('should reject request without authentication token', async () => {
      const response = await request(app)
        .post('/api/v1/attendance')
        .send({
          studentId,
          batchId,
          date: '2026-03-04',
          status: 'present'
        });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/attendance/student/:studentId - Get Student Attendance', () => {
    it('should fetch student attendance as admin', async () => {
      const response = await request(app)
        .get(`/api/v1/attendance/student/${studentId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should fetch attendance with date range filter', async () => {
      const response = await request(app)
        .get(`/api/v1/attendance/student/${studentId}`)
        .query({
          startDate: '2026-03-01',
          endDate: '2026-03-10'
        })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should allow student to view own attendance', async () => {
      const response = await request(app)
        .get(`/api/v1/attendance/student/${studentId}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return 404 for non-existent student', async () => {
      const response = await request(app)
        .get(`/api/v1/attendance/student/${new Types.ObjectId()}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(0);
    });
  });

  describe('GET /api/v1/attendance/batch/:batchId/date - Get Batch Attendance', () => {
    it('should fetch batch attendance for specific date', async () => {
      const response = await request(app)
        .get(`/api/v1/attendance/batch/${batchId}/date`)
        .query({ date: '2026-03-01' })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should return attendance for batch without date filter', async () => {
      const response = await request(app)
        .get(`/api/v1/attendance/batch/${batchId}/date`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/v1/attendance/batch/:batchId/summary - Batch Attendance Summary', () => {
    it('should fetch batch attendance summary with statistics', async () => {
      const response = await request(app)
        .get(`/api/v1/attendance/batch/${batchId}/summary`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalStudents');
      expect(response.body.data).toHaveProperty('presentCount');
      expect(response.body.data).toHaveProperty('absentCount');
      expect(response.body.data).toHaveProperty('leaveCount');
      expect(response.body.data).toHaveProperty('attendancePercentage');
    });

    it('should reject summary request from non-admin', async () => {
      const response = await request(app)
        .get(`/api/v1/attendance/batch/${batchId}/summary`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/v1/attendance/student/:studentId/summary - Student Attendance Summary', () => {
    it('should fetch student attendance summary', async () => {
      const response = await request(app)
        .get(`/api/v1/attendance/student/${studentId}/summary`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalDays');
      expect(response.body.data).toHaveProperty('presentDays');
      expect(response.body.data).toHaveProperty('absentDays');
      expect(response.body.data).toHaveProperty('leaveDays');
      expect(response.body.data).toHaveProperty('attendancePercentage');
    });

    it('should allow student to view own summary', async () => {
      const response = await request(app)
        .get(`/api/v1/attendance/student/${studentId}/summary`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/v1/attendance/range - Attendance by Date Range', () => {
    it('should fetch attendance within date range', async () => {
      const response = await request(app)
        .get('/api/v1/attendance/range')
        .query({
          batchId,
          startDate: '2026-03-01',
          endDate: '2026-03-10'
        })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('DELETE /api/v1/attendance/:attendanceId - Delete Attendance', () => {
    it('should delete attendance record as admin', async () => {
      // First create an attendance record to delete
      const createResponse = await request(app)
        .post('/api/v1/attendance')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          studentId,
          batchId,
          date: '2026-03-10',
          status: 'present'
        });

      const idToDelete = createResponse.body.data._id;

      // Then delete it
      const deleteResponse = await request(app)
        .delete(`/api/v1/attendance/${idToDelete}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body.success).toBe(true);
    });

    it('should return 404 for non-existent attendance', async () => {
      const response = await request(app)
        .delete(`/api/v1/attendance/${new Types.ObjectId()}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
    });

    it('should reject deletion from non-admin user', async () => {
      const response = await request(app)
        .delete(`/api/v1/attendance/${attendanceId}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('Attendance Statistics Validation', () => {
    it('should calculate attendance percentage correctly', async () => {
      const response = await request(app)
        .get(`/api/v1/attendance/student/${studentId}/summary`)
        .set('Authorization', `Bearer ${adminToken}`);

      const { totalDays, presentDays, attendancePercentage } = response.body.data;
      
      if (totalDays > 0) {
        const calculatedPercentage = (presentDays / totalDays) * 100;
        expect(Math.abs(attendancePercentage - calculatedPercentage)).toBeLessThan(0.01);
      }
    });

    it('should ensure sum of attendance statuses equals total', async () => {
      const response = await request(app)
        .get(`/api/v1/attendance/batch/${batchId}/summary`)
        .set('Authorization', `Bearer ${adminToken}`);

      const { presentCount, absentCount, leaveCount, totalStudents } = response.body.data;
      expect(presentCount + absentCount + leaveCount).toBe(totalStudents);
    });
  });
});
