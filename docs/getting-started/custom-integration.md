# Custom Test Integration

This guide explains how to integrate `playwright-api-spy` with custom test objects, such as those extended by other libraries like `playwright-relay`, `playwright-bdd`, or your own custom fixtures.

## The Problem

By default, `playwright-api-spy` intercepts the built-in `request` fixture from Playwright. However, when you extend `test` through other libraries, the `request` fixture might not be properly intercepted:

```typescript
// playwright-relay exports its own test
import { test as relayTest } from 'playwright-relay';

// Extending with your fixtures
export const test = relayTest.extend<MyFixtures>({
  rawApi: async ({ request }, use) => {
    await use(request); // This request is NOT wrapped by api-spy!
  },
  api: async ({ rawApi }, use) => {
    await use(new MyApi(rawApi));
  },
});
```

**Result:** Requests made through `api` are not logged by `playwright-api-spy`.

## Solutions

### Solution 1: `extendWithApiSpy(baseTest)`

The easiest approach - extend any test object with API Spy capabilities:

```typescript
import { test as relayTest } from 'playwright-relay';
import { extendWithApiSpy } from 'playwright-api-spy';

// Step 1: Extend relay with api-spy
const testWithSpy = extendWithApiSpy(relayTest);

// Step 2: Extend with your fixtures
export const test = testWithSpy.extend<MyFixtures>({
  settings: async ({}, use) => {
    await use(getSettings());
  },
  
  // rawApi now uses the wrapped request automatically!
  rawApi: async ({ request }, use) => {
    await use(request);
  },
  
  api: async ({ rawApi }, use) => {
    await use(new MyApi(rawApi));
  },
});

export { expect } from '@playwright/test';
```

This automatically:

- Creates an `apiSpy` fixture
- Wraps the `request` fixture with API Spy interception

### Solution 2: `extendWithApiSpyFixture(baseTest)` + `wrapWithApiSpy()`

For more control over which contexts are wrapped:

```typescript
import { test as relayTest } from 'playwright-relay';
import { extendWithApiSpyFixture, wrapWithApiSpy } from 'playwright-api-spy';

// Add only the apiSpy fixture (without auto-wrapping request)
const testWithSpy = extendWithApiSpyFixture(relayTest);

export const test = testWithSpy.extend<MyFixtures>({
  // Manually wrap specific fixtures
  rawApi: async ({ request, apiSpy }, use) => {
    const wrapped = wrapWithApiSpy(request, apiSpy);
    await use(wrapped);
  },
  
  // This one is NOT wrapped
  internalApi: async ({ request }, use) => {
    await use(request);
  },
  
  api: async ({ rawApi }, use) => {
    await use(new MyApi(rawApi));
  },
});
```

### Solution 3: Manual Setup with `ApiSpyInstance`

For complete control, create your own spy instance:

```typescript
import { test as relayTest } from 'playwright-relay';
import { 
  ApiSpyInstance, 
  getApiSpyConfig, 
  wrapWithApiSpy,
  globalApiSpyStore 
} from 'playwright-api-spy';

export const test = relayTest.extend<MyFixtures>({
  apiSpy: async ({}, use, testInfo) => {
    // Create spy with config from withApiSpy()
    const config = getApiSpyConfig();
    const spy = new ApiSpyInstance(config);
    
    spy.setTestInfo({ 
      title: testInfo.title, 
      file: testInfo.file,
      line: testInfo.line,
    });
    
    await use(spy);
    
    // Add entries to global store for report generation
    const entries = spy.getEntriesForReport();
    globalApiSpyStore.addEntries(entries);
    
    // Optionally attach to Playwright report
    if (config.attachToPlaywrightReport && entries.length > 0) {
      await testInfo.attach('api-spy-requests', {
        body: Buffer.from(JSON.stringify(entries, null, 2)),
        contentType: 'application/json',
      });
    }
  },
  
  rawApi: async ({ request, apiSpy }, use) => {
    const wrapped = wrapWithApiSpy(request, apiSpy);
    await use(wrapped);
  },
});
```

## Complete Example with playwright-relay

Here's a full example integrating with `playwright-relay`:

### `src/fixtures/engine.fixtures.ts`

```typescript
import { test as relayTest } from 'playwright-relay';
import { extendWithApiSpy } from 'playwright-api-spy';
import { EngineApi } from './engine-api';
import { getSettings } from './settings';

// Types
export interface EngineFixtures {
  settings: Settings;
  rawApi: APIRequestContext;
  api: EngineApi;
}

// Step 1: Extend relay with api-spy
const baseTest = extendWithApiSpy(relayTest);

// Step 2: Extend with your fixtures
export const test = baseTest.extend<EngineFixtures>({
  settings: async ({}, use) => {
    await use(getSettings());
  },
  
  rawApi: async ({ request }, use) => {
    await use(request); // Automatically wrapped!
  },
  
  api: async ({ rawApi }, use) => {
    await use(new EngineApi(rawApi));
  },
});

export { expect } from '@playwright/test';
```

### `playwright.config.ts`

```typescript
import { defineConfig } from '@playwright/test';
import { withRelay } from 'playwright-relay';
import { withApiSpy } from 'playwright-api-spy';

export default defineConfig(withApiSpy(withRelay({
  testDir: 'tests',
  use: {
    baseURL: 'https://api.example.com',
  },
}, {
  persistCache: true,
}), {
  console: true,
  verbosity: 'normal',
  htmlReport: { enabled: true },
  jsonReport: { enabled: true },
}));
```

### `tests/engine.spec.ts`

```typescript
import { test, expect } from '../src/fixtures/engine.fixtures';

test('should create user', async ({ api, apiSpy }) => {
  // All requests through api are now captured
  const user = await api.createUser({ name: 'John' });
  
  expect(user.id).toBeDefined();
  
  // You can also access captured requests
  expect(apiSpy.lastRequest?.method).toBe('POST');
  expect(apiSpy.lastResponse?.status).toBe(201);
});
```

## API Reference

### `extendWithApiSpy(baseTest)`

Extends a test object with both `apiSpy` fixture and wrapped `request` fixture.

```typescript
function extendWithApiSpy<TestArgs, WorkerArgs>(
  baseTest: TestType<TestArgs, WorkerArgs>
): TestType<TestArgs & ApiSpyFixtures, WorkerArgs>
```

### `extendWithApiSpyFixture(baseTest)`

Extends a test object with only the `apiSpy` fixture (no auto-wrapping of request).

```typescript
function extendWithApiSpyFixture<TestArgs, WorkerArgs>(
  baseTest: TestType<TestArgs, WorkerArgs>
): TestType<TestArgs & ApiSpyFixtures, WorkerArgs>
```

### `wrapWithApiSpy(context, spy)`

Wraps an `APIRequestContext` with API Spy interception.

```typescript
function wrapWithApiSpy(
  apiContext: APIRequestContext,
  spy: ApiSpy | ApiSpyInstance
): APIRequestContext
```

### `getApiSpyConfig()`

Gets the current API Spy configuration from the global store (set via `withApiSpy()`).

```typescript
function getApiSpyConfig(): Required<ApiSpyConfig>
```

### `ApiSpyInstance`

The main class for capturing requests. Can be instantiated manually for custom setups.

```typescript
class ApiSpyInstance implements ApiSpy {
  constructor(config?: ApiSpyConfig);
  setTestInfo(info: { title: string; file: string; line?: number }): void;
  captureRequest(method: string, url: string, options?: {...}): Promise<CapturedRequest | null>;
  captureResponse(request: CapturedRequest, response: {...}, duration: number): Promise<void>;
  captureError(request: CapturedRequest, error: Error): Promise<void>;
  getEntriesForReport(): CapturedEntry[];
  // ... and more
}
```

### `globalApiSpyStore`

Global store for configuration and captured entries. Used internally by the reporter.

```typescript
const globalApiSpyStore: {
  config: Required<ApiSpyConfig>;
  setConfig(config: Required<ApiSpyConfig>): void;
  addEntries(entries: CapturedEntry[]): void;
  getAllEntries(): CapturedEntry[];
  reset(): void;
  clear(): void;
}
```
