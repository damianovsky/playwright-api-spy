import { defineConfig } from '@playwright/test';
import { withApiSpy } from './src/index.js';

export default defineConfig(withApiSpy({
  testDir: './tests',
  use: {
    baseURL: 'https://jsonplaceholder.typicode.com',
  },
  reporter: [['list'], ['./dist/reporter.js']],
}, {
  console: false,
  verbosity: 'normal',
  htmlReport: {
    enabled: true,
    outputDir: './playwright-report',
    filename: 'api-spy.html',
  },
  jsonReport: {
    enabled: true,
    outputDir: './playwright-report',
    filename: 'api-spy.json',
  },
  redact: {
    headers: ['Authorization'],
    bodyFields: ['password', 'secret'],
    replacement: '[REDACTED]',
  },
  colors: true,
  attachToPlaywrightReport: true,
}));
