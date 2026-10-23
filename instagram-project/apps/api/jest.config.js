module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/../tsconfig.jest.json' }] },
  testEnvironment: 'node',
  setupFiles: ['reflect-metadata'],
  collectCoverageFrom: ['**/*.ts', '!generated/**', '!main.ts'],
  coverageDirectory: '../coverage',
};
