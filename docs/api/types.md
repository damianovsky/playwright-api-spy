# TypeScript Types

## CapturedRequest

```typescript
interface CapturedRequest {
  id: string;
  method: HttpMethod;
  url: string;
  path: string;
  headers: Record<string, string>;
  body?: unknown;
  timestamp: number;
  testInfo?: {
    title: string;
    file: string;
    line?: number;
  };
  metadata?: Record<string, unknown>;
}
```

## CapturedResponse

```typescript
interface CapturedResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body?: unknown;
  duration: number;
}
```

## CapturedEntry

```typescript
interface CapturedEntry {
  request: CapturedRequest;
  response?: CapturedResponse;
  error?: {
    message: string;
    stack?: string;
  };
}
```

## HttpMethod

```typescript
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
```

## ApiSpyConfig

```typescript
interface ApiSpyConfig {
  console?: boolean;
  verbosity?: 'minimal' | 'normal' | 'verbose';
  colors?: boolean;
  maxBodyLength?: number;
  attachToPlaywrightReport?: boolean;
  
  htmlReport?: {
    enabled: boolean;
    outputDir?: string;
    filename?: string;
  };
  
  jsonReport?: {
    enabled: boolean;
    outputDir?: string;
    filename?: string;
  };
  
  redact?: {
    headers?: string[];
    bodyFields?: string[];
    replacement?: string;
  };
  
  filter?: {
    includePaths?: string[];
    excludePaths?: string[];
    methods?: HttpMethod[];
  };
}
```

## Callback Types

```typescript
type OnRequestCallback = (request: CapturedRequest) => void | Promise<void>;

type OnResponseCallback = (
  request: CapturedRequest, 
  response: CapturedResponse
) => void | Promise<void>;

type OnErrorCallback = (
  request: CapturedRequest, 
  error: Error
) => void | Promise<void>;
```
