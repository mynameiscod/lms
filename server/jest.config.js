module.exports = {
  // Preset for TypeScript
  preset: 'ts-jest',

  // Test environment
  testEnvironment: 'node',

  // Root directories
  roots: ['<rootDir>/src'],

  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).ts'
  ],

  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

  // Transform files
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },

  // Module name mapper for path aliases
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },

  // Collect coverage from these files
  collectCoverageFrom: [
    'src/**/*.ts',
    'src/**/*.tsx',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/server.ts',
    '!src/app.ts'
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },

  // Coverage reporters
  coverageReporters: ['text', 'lcov', 'html', 'json', 'json-summary'],

  // Test timeout (in milliseconds)
  testTimeout: 10000,

  // Verbose output
  verbose: true,

  // Setup files after env
  setupFilesAfterEnv: ['<rootDir>/src/tests/setup.ts'],

  // Globals
  globals: {
    'ts-jest': {
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true
      }
    }
  },

  // Don't collect coverage from node_modules
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],

  // Max workers for parallel testing
  maxWorkers: '50%',

  // Clear mocks between tests
  clearMocks: true,

  // Restore mocks between tests
  restoreMocks: true,

  // Reset modules between tests
  resetModules: false,

  // Detect open handles
  detectOpenHandles: false,

  // Force exit
  forceExit: false
};
