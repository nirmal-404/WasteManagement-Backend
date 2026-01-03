export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['/_tests_//.ts', '/?(.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src//*.ts',
    '!src//*.d.ts',
    '!src//*.test.ts',
    '!src//*.spec.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'text-summary', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 75,
      lines: 80,
      statements: 80
    }
  },
  verbose: true,
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/src/_tests_/setup.ts'],
  testTimeout: 10000,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
};
