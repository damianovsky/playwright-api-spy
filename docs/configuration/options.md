# Configuration Options

## Full Configuration Example

```typescript
import { defineConfig } from '@playwright/test';
import { withApiSpy } from 'playwright-api-spy';

export default defineConfig(withApiSpy({
  // Playwright config
  testDir: './tests',
}, {
  // API Spy config
  console: false,
  verbosity: 'normal',
  colors: true,
  maxBodyLength: 10000,
  attachToPlaywrightReport: true,
  
  htmlReport: {
    enabled: true,
    outputDir: './api-spy-report',
    filename: 'api-spy.html',
  },
  
  jsonReport: {
    enabled: true,
    outputDir: './api-spy-report',
    filename: 'api-spy.json',
  },
  
  redact: {
    headers: ['Authorization', 'X-API-Key'],
    bodyFields: ['password', 'token', 'secret'],
    replacement: '[REDACTED]',
  },
  
  filter: {
    includePaths: ['/api/'],
    excludePaths: ['/health', '/metrics'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
}));
```

## Options Reference

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `console` | `boolean` | `false` | Enable console logging |
| `verbosity` | `string` | `'normal'` | Detail level: `minimal`, `normal`, `verbose` |
| `colors` | `boolean` | `true` | Enable colored console output |
| `maxBodyLength` | `number` | `10000` | Max body length in characters |
| `attachToPlaywrightReport` | `boolean` | `true` | Attach data to Playwright report |

### HTML Report

| Option | Type | Default |
|--------|------|---------|
| `htmlReport.enabled` | `boolean` | `true` |
| `htmlReport.outputDir` | `string` | `'./api-spy-report'` |
| `htmlReport.filename` | `string` | `'api-spy.html'` |

### JSON Report

| Option | Type | Default |
|--------|------|---------|
| `jsonReport.enabled` | `boolean` | `true` |
| `jsonReport.outputDir` | `string` | `'./api-spy-report'` |
| `jsonReport.filename` | `string` | `'api-spy.json'` |

### Redaction

See [Redaction](redaction.md) for detailed configuration.

### Filtering

See [Filtering](filtering.md) for detailed configuration.
