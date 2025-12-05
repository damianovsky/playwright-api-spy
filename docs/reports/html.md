# HTML Report

The HTML report provides an interactive view of all captured API requests.

## Features

- **Filtering** - Filter by HTTP method and status code
- **Search** - Search requests by path
- **Timeline** - Visual timeline of request timing
- **Details** - Expandable request/response details
- **cURL Export** - Copy requests as cURL commands

## Generating the Report

The HTML report is generated automatically when tests complete.

```typescript
// playwright.config.ts
withApiSpy({}, {
  htmlReport: {
    enabled: true,
    outputDir: './api-spy-report',
    filename: 'api-spy.html',
  },
});
```

## Opening the Report

After tests complete, open the report:

```bash
# macOS
open api-spy-report/api-spy.html

# Linux
xdg-open api-spy-report/api-spy.html

# Windows
start api-spy-report/api-spy.html
```

## Report Sections

### Summary Stats

Shows total requests, success/failure counts, and average duration.

### Timeline

Visual representation of when requests were made during the test run.

### Request List

Each request shows:

- HTTP method (color-coded)
- Request path
- Response status
- Duration

Click to expand and see:

- Full URL
- Request headers
- Request body
- Response headers
- Response body
- cURL command

## CI/CD Integration

Upload the report as an artifact:

```yaml
# GitHub Actions
- name: Upload API Report
  uses: actions/upload-artifact@v3
  if: always()
  with:
    name: api-spy-report
    path: api-spy-report/
```
