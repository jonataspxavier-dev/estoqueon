/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.test.json' }] },
  globalSetup: '<rootDir>/tests/globalSetup.ts',
  setupFiles: ['<rootDir>/tests/setupEnv.ts'],
  testTimeout: 30000,
  collectCoverageFrom: ['src/**/*.ts', '!src/server.ts', '!src/docs/**'],
};
