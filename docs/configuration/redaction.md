# Data Redaction

Automatically hide sensitive data in reports.

## Configuration

```typescript
withApiSpy({}, {
  redact: {
    headers: ['Authorization', 'X-API-Key', 'Cookie'],
    bodyFields: ['password', 'token', 'secret', 'apiKey'],
    replacement: '[REDACTED]',
  },
});
```

## Options

### `headers`

Array of header names to redact (case-insensitive).

```typescript
redact: {
  headers: [
    'Authorization',
    'X-API-Key',
    'Cookie',
    'Set-Cookie',
    'X-Auth-Token',
  ],
}
```

### `bodyFields`

Array of JSON field names to redact (searches nested objects).

```typescript
redact: {
  bodyFields: [
    'password',
    'token',
    'secret',
    'apiKey',
    'accessToken',
    'refreshToken',
    'creditCard',
  ],
}
```

### `replacement`

The text used to replace sensitive values.

```typescript
redact: {
  replacement: '[REDACTED]',  // default
  // or
  replacement: '***',
  // or
  replacement: '●●●●●●●●',
}
```

## Default Values

By default, these values are redacted:

**Headers:**
- `Authorization`
- `X-API-Key`
- `Cookie`
- `Set-Cookie`

**Body Fields:**
- `password`
- `token`
- `secret`
- `api_key`
- `apiKey`
- `accessToken`
- `refreshToken`

## Example

**Original request:**
```json
{
  "username": "john",
  "password": "secret123",
  "settings": {
    "apiKey": "sk-1234567890"
  }
}
```

**After redaction:**
```json
{
  "username": "john",
  "password": "[REDACTED]",
  "settings": {
    "apiKey": "[REDACTED]"
  }
}
```
