# Quick Start

## 1. Configure Playwright

Update your `playwright.config.ts` to include API Spy:

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

## 2. Write Your Tests

Use the `testWithApiSpy` fixture to capture API requests:

```typescript
// tests/api.spec.ts
import { testWithApiSpy as test, expect } from 'playwright-api-spy';

test('should create user', async ({ request, apiSpy }) => {
  // Make API request
  const response = await request.post('/users', {
    data: { 
      name: 'John', 
      email: 'john@example.com' 
    },
  });
  
  // Standard Playwright assertions
  expect(response.ok()).toBeTruthy();
  
  // API Spy assertions
  expect(apiSpy.lastRequest?.method).toBe('POST');
  expect(apiSpy.lastRequest?.path).toBe('/users');
  expect(apiSpy.lastResponse?.status).toBe(201);
});
```

## 3. Run Tests

```bash
npx playwright test
```

## 4. View Reports

After tests complete, find your reports in:

- **HTML Report**: `./api-spy-report/api-spy.html`
- **JSON Report**: `./api-spy-report/api-spy.json`

## Optional: Add Reporter

For automatic report generation, add the reporter to your config:

```typescript
// playwright.config.ts
export default defineConfig({
  reporter: [
    ['html'],
    ['playwright-api-spy/reporter'],
  ],
});
```
