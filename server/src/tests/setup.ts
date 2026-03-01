/**
 * Jest Setup File
 * Runs before all tests
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lms-test';

// Global test timeout
jest.setTimeout(15000);

// Suppress console logs during tests (optional)
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  // You can modify console behavior here if needed
});

afterAll(() => {
  // Restore console if modified
  console.log = originalLog;
  console.error = originalError;
  console.warn = originalWarn;
});

// Global test utilities
global.testUtils = {
  /**
   * Create mock JWT token
   */
  createMockToken: (payload: any) => {
    return Buffer.from(JSON.stringify(payload)).toString('base64');
  },

  /**
   * Create mock user
   */
  createMockUser: (overrides?: any) => {
    return {
      _id: 'user-id-123',
      name: 'Test User',
      email: 'test@example.com',
      role: 'STUDENT',
      tenantId: 'tenant-123',
      status: 'active',
      ...overrides
    };
  },

  /**
   * Create mock batch
   */
  createMockBatch: (overrides?: any) => {
    return {
      _id: 'batch-id-123',
      name: 'Test Batch',
      code: 'TB-001',
      courseId: 'course-123',
      tenantId: 'tenant-123',
      startDate: new Date('2026-02-01'),
      endDate: new Date('2026-05-01'),
      ...overrides
    };
  },

  /**
   * Create mock attendance
   */
  createMockAttendance: (overrides?: any) => {
    return {
      _id: 'attendance-id-123',
      studentId: 'student-123',
      batchId: 'batch-123',
      date: new Date('2026-03-01'),
      status: 'present',
      inTime: '09:00',
      outTime: '17:00',
      markedBy: 'admin-123',
      tenantId: 'tenant-123',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    };
  }
};

// Stub for unimplemented features
const unimplementedError = new Error('Not implemented in test');

// Clear jest cache
afterEach(() => {
  jest.clearAllMocks();
});

// Setup for async operations
afterAll(async () => {
  // Cleanup async resources
});
