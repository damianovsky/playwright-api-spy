# JSON Report

The JSON report provides machine-readable data for further analysis or CI/CD integration.

## Configuration

```typescript
// playwright.config.ts
withApiSpy({}, {
  jsonReport: {
    enabled: true,
    outputDir: './api-spy-report',
    filename: 'api-spy.json',
  },
});
```

## Report Structure

```json
{
  "version": "1.0.0",
  "generatedAt": "2024-12-05T10:30:00.000Z",
  "summary": {
    "totalRequests": 15,
    "successfulRequests": 14,
    "failedRequests": 1,
    "avgDuration": 234,
    "minDuration": 45,
    "maxDuration": 890
  },
  "entries": [
    {
      "request": {
        "id": "1733394600000-abc123",
        "method": "POST",
        "url": "https://api.example.com/users",
        "path": "/users",
        "headers": {
          "content-type": "application/json"
        },
        "body": {
          "name": "John"
        },
        "timestamp": 1733394600000
      },
      "response": {
        "status": 201,
        "statusText": "Created",
        "headers": {
          "content-type": "application/json"
        },
        "body": {
          "id": 1,
          "name": "John"
        },
        "duration": 234
      }
    }
  ]
}
```

## Using the Report

### Parse with Node.js

```javascript
const fs = require('fs');
const report = JSON.parse(fs.readFileSync('api-spy-report/api-spy.json'));

console.log(`Total requests: ${report.summary.totalRequests}`);
console.log(`Failed: ${report.summary.failedRequests}`);
```

### Check in CI/CD

```yaml
# Check for failed requests
- name: Check API Results
  run: |
    FAILED=$(jq '.summary.failedRequests' api-spy-report/api-spy.json)
    if [ "$FAILED" -gt 0 ]; then
      echo "Found $FAILED failed API requests"
      exit 1
    fi
```

### Generate Custom Reports

```javascript
const report = require('./api-spy-report/api-spy.json');

// Find slow requests
const slowRequests = report.entries.filter(
  e => e.response && e.response.duration > 1000
);

console.log('Slow requests:', slowRequests.length);
```
