# Request Filtering

Control which requests are captured using path patterns and HTTP methods.

## Configuration

```typescript
withApiSpy({}, {
  filter: {
    includePaths: ['/api/'],
    excludePaths: ['/health', '/metrics'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});
```

## Options

### `includePaths`

Array of regex patterns. Only requests matching these patterns are captured.

```typescript
filter: {
  includePaths: [
    '/api/',           // Any path containing /api/
    '^/users',         // Paths starting with /users
    '/orders/\\d+',    // /orders/ followed by numbers
  ],
}
```

!!! note
    If empty, all paths are included by default.

### `excludePaths`

Array of regex patterns. Matching requests are excluded.

```typescript
filter: {
  excludePaths: [
    '/health',
    '/metrics',
    '/internal/',
  ],
}
```

### `methods`

Array of HTTP methods to capture.

```typescript
filter: {
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
}
```

## Examples

### Only API Routes

```typescript
filter: {
  includePaths: ['^/api/'],
}
```

### Exclude Health Checks

```typescript
filter: {
  excludePaths: ['/health', '/ping', '/metrics'],
}
```

### Only Mutations

```typescript
filter: {
  methods: ['POST', 'PUT', 'PATCH', 'DELETE'],
}
```
