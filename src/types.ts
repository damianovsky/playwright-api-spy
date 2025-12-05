import type { PlaywrightTestConfig } from '@playwright/test';

/**
 * Logging verbosity level
 */
export type Verbosity = 'minimal' | 'normal' | 'verbose';

/**
 * HTTP methods
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

/**
 * HTML report configuration
 */
export interface HtmlReportConfig {
  enabled: boolean;
  outputDir?: string;
  filename?: string;
}

/**
 * JSON report configuration
 */
export interface JsonReportConfig {
  enabled: boolean;
  outputDir?: string;
  filename?: string;
}

/**
 * Sensitive data redaction configuration
 */
export interface RedactConfig {
  /** Headers to redact */
  headers?: string[];
  /** JSON body fields to redact */
  bodyFields?: string[];
  /** Replacement text */
  replacement?: string;
}

/**
 * Request filtering configuration
 */
export interface FilterConfig {
  /** Only log requests to these paths (regex patterns) */
  includePaths?: string[];
  /** Exclude these paths from logging (regex patterns) */
  excludePaths?: string[];
  /** Only log these HTTP methods */
  methods?: HttpMethod[];
}

/**
 * Main API Spy configuration
 */
export interface ApiSpyConfig {
  /** Enable/disable console logging */
  console?: boolean;
  /** Verbosity level: 'minimal' | 'normal' | 'verbose' */
  verbosity?: Verbosity;
  /** HTML report configuration */
  htmlReport?: HtmlReportConfig;
  /** JSON report configuration */
  jsonReport?: JsonReportConfig;
  /** Sensitive data redaction */
  redact?: RedactConfig;
  /** Request filtering (which requests to log) */
  filter?: FilterConfig;
  /** Maximum body length for logging (in characters) */
  maxBodyLength?: number;
  /** Enable colored console output */
  colors?: boolean;
  /** Attach captured data to Playwright report */
  attachToPlaywrightReport?: boolean;
}

/**
 * Default configuration
 */
export const DEFAULT_CONFIG: Required<ApiSpyConfig> = {
  console: false,
  verbosity: 'normal',
  htmlReport: {
    enabled: true,
    outputDir: './playwright-report',
    filename: 'api-spy.html',
  },
  jsonReport: {
    enabled: true,
    outputDir: './playwright-report',
    filename: 'api-spy.json',
  },
  redact: {
    headers: ['Authorization', 'X-API-Key', 'Cookie', 'Set-Cookie'],
    bodyFields: ['password', 'token', 'secret', 'api_key', 'apiKey', 'accessToken', 'refreshToken'],
    replacement: '[REDACTED]',
  },
  filter: {
    includePaths: [],
    excludePaths: [],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
  },
  maxBodyLength: 10000,
  colors: true,
  attachToPlaywrightReport: true,
};

/**
 * Captured request data
 */
export interface CapturedRequest {
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

/**
 * Captured response data
 */
export interface CapturedResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body?: unknown;
  duration: number;
}

/**
 * Complete request-response entry
 */
export interface CapturedEntry {
  request: CapturedRequest;
  response?: CapturedResponse;
  error?: {
    message: string;
    stack?: string;
  };
}

/**
 * onRequest hook callback
 */
export type OnRequestCallback = (request: CapturedRequest) => void | Promise<void>;

/**
 * onResponse hook callback
 */
export type OnResponseCallback = (request: CapturedRequest, response: CapturedResponse) => void | Promise<void>;

/**
 * onError hook callback
 */
export type OnErrorCallback = (request: CapturedRequest, error: Error) => void | Promise<void>;

/**
 * API Spy interface available in tests
 */
export interface ApiSpy {
  /** All captured requests */
  readonly requests: CapturedRequest[];
  /** All captured entries (request + response) */
  readonly entries: CapturedEntry[];
  /** Last captured request */
  readonly lastRequest: CapturedRequest | undefined;
  /** Last captured response */
  readonly lastResponse: CapturedResponse | undefined;
  /** Last captured entry */
  readonly lastEntry: CapturedEntry | undefined;
  
  /** Add context to subsequent requests */
  addContext(context: string): void;
  /** Clear added context */
  clearContext(): void;
  
  /** Pause logging */
  pause(): void;
  /** Resume logging */
  resume(): void;
  /** Check if logging is paused */
  readonly isPaused: boolean;
  
  /** Clear all captured requests */
  clear(): void;
  
  /** Hook called on each request */
  onRequest(callback: OnRequestCallback): void;
  /** Hook called on each response */
  onResponse(callback: OnResponseCallback): void;
  /** Hook called on error */
  onError(callback: OnErrorCallback): void;
}

/**
 * Extended Playwright config type with API Spy
 */
export type PlaywrightTestConfigWithApiSpy = PlaywrightTestConfig & {
  apiSpy?: ApiSpyConfig;
};
