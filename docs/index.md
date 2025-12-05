# Playwright API Spy

A Playwright plugin for capturing and logging API requests/responses with beautiful HTML and JSON reports.

## Features

- 🔍 **Automatic Capture** - Intercepts all requests made via Playwright's `APIRequestContext`
- 📊 **Beautiful Reports** - Playwright-style HTML reports with filtering and search
- 📄 **JSON Export** - Machine-readable reports for CI/CD integration
- 🔒 **Data Redaction** - Automatically hide sensitive data (passwords, tokens)
- 📎 **Playwright Integration** - Attach API data to Playwright test reports
- ⏱️ **Timeline View** - Visualize request timing

## Quick Example

```typescript
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

## Installation

```bash
npm install playwright-api-spy
```

## Next Steps

- [Installation Guide](getting-started/installation.md)
- [Quick Start](getting-started/quick-start.md)
- [Configuration Options](configuration/options.md)
