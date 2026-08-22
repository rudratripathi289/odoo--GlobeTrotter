/** @type {import('jest').Config} */
const config = {
  // Use the experimental VM modules to support ES Modules ("type":"module")
  testEnvironment: 'node',
  transform: {},   // No Babel transform — we rely on Node's native ESM support
  testMatch: ['**/tests/**/*.test.js'],
  clearMocks: true,
  // Sequential run to avoid DB race conditions across test files
  maxWorkers: 1,
  testTimeout: 60000,
};

export default config;
