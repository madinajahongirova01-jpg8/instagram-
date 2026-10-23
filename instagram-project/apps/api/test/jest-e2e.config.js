module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.e2e-spec.ts$',
  transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/../tsconfig.jest.json' }] },
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/setup-env.ts'],
  testTimeout: 60000,
};
