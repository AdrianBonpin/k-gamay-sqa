const { defineConfig } = require('vitest/config');

module.exports = defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.js'],
    testTimeout: 15000,
    pool: 'forks',
    poolOptions: {
      forks: { singleFork: true },
    },
  },
});
