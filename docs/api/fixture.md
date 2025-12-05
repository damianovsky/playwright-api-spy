# apiSpy Fixture

The `apiSpy` fixture provides access to captured API requests and responses within your tests.

## Usage

```typescript
import { testWithApiSpy as test, expect } from 'playwright-api-spy';

test('example', async ({ request, apiSpy }) => {
  await request.get('/users');
  
  console.log(apiSpy.lastRequest);
  console.log(apiSpy.lastResponse);
});
```

## Properties

### `requests`

Array of all captured requests.

```typescript
const allRequests = apiSpy.requests;
expect(apiSpy.requests).toHaveLength(3);
```

### `entries`

Array of all captured entries (request + response pairs).

```typescript
const allEntries = apiSpy.entries;
```

### `lastRequest`

Most recently captured request.

```typescript
expect(apiSpy.lastRequest?.method).toBe('POST');
expect(apiSpy.lastRequest?.path).toBe('/users');
```

### `lastResponse`

Most recently captured response.

```typescript
expect(apiSpy.lastResponse?.status).toBe(200);
expect(apiSpy.lastResponse?.duration).toBeLessThan(1000);
```

### `lastEntry`

Most recently captured entry (request + response).

```typescript
const entry = apiSpy.lastEntry;
console.log(entry?.request, entry?.response);
```

### `isPaused`

Whether capturing is currently paused.

```typescript
expect(apiSpy.isPaused).toBe(false);
```

## Methods

### `addContext(context: string)`

Add context annotation to subsequent requests.

```typescript
apiSpy.addContext('Creating test user');
await request.post('/users', { data: { name: 'Test' } });
apiSpy.clearContext();
```

### `clearContext()`

Clear the context annotation.

### `pause()`

Pause request capturing.

```typescript
apiSpy.pause();
await request.get('/noisy-endpoint'); // Not captured
apiSpy.resume();
```

### `resume()`

Resume request capturing.

### `clear()`

Clear all captured requests.

```typescript
apiSpy.clear();
expect(apiSpy.requests).toHaveLength(0);
```

## Hooks

### `onRequest(callback)`

Called when a request is made.

```typescript
apiSpy.onRequest((req) => {
  console.log(`Request: ${req.method} ${req.path}`);
});
```

### `onResponse(callback)`

Called when a response is received.

```typescript
apiSpy.onResponse((req, res) => {
  if (res.duration > 1000) {
    console.warn(`Slow: ${req.path} took ${res.duration}ms`);
  }
});
```

### `onError(callback)`

Called when a request fails.

```typescript
apiSpy.onError((req, error) => {
  console.error(`Failed: ${req.path} - ${error.message}`);
});
```
