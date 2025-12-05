<p align="center">
  <h1 align="center">playwright-api-spy</h1>
  <p align="center">
    Capture and log API requests/responses with beautiful HTML and JSON reports
  </p>
  <p align="center">
    <a href="https://github.com/damianovsky/playwright-api-spy/releases"><img src="https://img.shields.io/github/v/release/damianovsky/playwright-api-spy?include_prereleases" alt="GitHub release"></a>
    <a href="https://www.npmjs.com/package/playwright-api-spy"><img src="https://img.shields.io/npm/v/playwright-api-spy.svg" alt="npm version"></a>
    <a href="https://github.com/damianovsky/playwright-api-spy/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/playwright-api-spy.svg" alt="license"></a>
  </p>
</p>

---

## Features

- 🔍 **Automatic Capture** - Intercepts all requests made via Playwright's `APIRequestContext`
- 📊 **Beautiful Reports** - Playwright-style HTML reports with filtering and search
- 📄 **JSON Export** - Machine-readable reports for CI/CD integration
- 🔒 **Data Redaction** - Automatically hide sensitive data (passwords, tokens)
- 📎 **Playwright Integration** - Attach API data to Playwright test reports
- ⏱️ **Timeline View** - Visualize request timing

## Installation

```bash
npm install playwright-api-spy
```

## Quick Start

### 1. Configure Playwright

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';
import { withApiSpy } from 'playwright-api-spy';

export default defineConfig(withApiSpy({
  testDir: './tests',
  use: {
    baseURL: 'https://api.example.com',
  },
}, {
  // API Spy options (all optional)
  htmlReport: { enabled: true },
  jsonReport: { enabled: true },
}));
```

### 2. Use in Tests

```typescript
// tests/api.spec.ts
import { testWithApiSpy as test, expect } from 'playwright-api-spy';

test('should create user', async ({ request, apiSpy }) => {
  const response = await request.post('/users', {
    data: { name: 'John', email: 'john@example.com' },
  });
  
  expect(response.ok()).toBeTruthy();
  expect(apiSpy.lastRequest?.method).toBe('POST');
  expect(apiSpy.lastResponse?.status).toBe(201);
});
```

### 3. Add Reporter (Optional)

```typescript
// playwright.config.ts
export default defineConfig({
  reporter: [
    ['html'],
    ['playwright-api-spy/reporter'],
  ],
});
```

## Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `console` | `boolean` | `false` | Log requests to console |
| `verbosity` | `'minimal' \| 'normal' \| 'verbose'` | `'normal'` | Console output detail level |
| `htmlReport.enabled` | `boolean` | `true` | Generate HTML report |
| `htmlReport.outputDir` | `string` | `'./playwright-report'` | Output directory |
| `jsonReport.enabled` | `boolean` | `true` | Generate JSON report |
| `attachToPlaywrightReport` | `boolean` | `true` | Attach data to Playwright report |
| `redact.headers` | `string[]` | `['Authorization', ...]` | Headers to redact |
| `redact.bodyFields` | `string[]` | `['password', ...]` | Body fields to redact |
| `filter.includePaths` | `string[]` | `[]` | Only log matching paths (regex) |
| `filter.excludePaths` | `string[]` | `[]` | Exclude matching paths (regex) |

## Viewing Reports

After running tests, view the API Spy report:

```bash
npx playwright-api-spy show-report
```

The report will be located in `playwright-report/api-spy.html` alongside the Playwright HTML report.

## API Reference

### `apiSpy` Fixture

```typescript
interface ApiSpy {
  requests: CapturedRequest[];      // All captured requests
  lastRequest?: CapturedRequest;    // Most recent request
  lastResponse?: CapturedResponse;  // Most recent response
  
  addContext(context: string): void;  // Add context to requests
  clearContext(): void;               // Clear context
  pause(): void;                      // Pause capturing
  resume(): void;                     // Resume capturing
  clear(): void;                      // Clear captured data
  
  onRequest(callback): void;          // Request hook
  onResponse(callback): void;         // Response hook
  onError(callback): void;            // Error hook
}
```

## Documentation

📖 **[Full Documentation](https://damianovsky.github.io/playwright-api-spy)**
