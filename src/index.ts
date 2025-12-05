// Main exports
export { withApiSpy, defineApiSpyConfig, getApiSpyConfig } from './config.js';
export { test, testWithApiSpy, expect, ApiSpyReporter } from './fixture.js';
export { ApiSpyInstance, globalApiSpyStore } from './api-spy.js';

// Extension utilities for custom test objects
export { extendWithApiSpy, extendWithApiSpyFixture } from './extend.js';
export type { ApiSpyFixtures, ApiSpyFixturesWithRequest } from './extend.js';

// Wrapper for custom APIRequestContext
export { wrapWithApiSpy, isAPIRequestContext } from './wrapper.js';

// Types
export type {
  ApiSpyConfig,
  ApiSpy,
  Verbosity,
  HttpMethod,
  HtmlReportConfig,
  JsonReportConfig,
  RedactConfig,
  FilterConfig,
  CapturedRequest,
  CapturedResponse,
  CapturedEntry,
  OnRequestCallback,
  OnResponseCallback,
  OnErrorCallback,
  PlaywrightTestConfigWithApiSpy,
} from './types.js';

export { DEFAULT_CONFIG } from './types.js';

// Report generators (for advanced users)
export { JsonReportGenerator } from './json-report.js';
export type { JsonReport } from './json-report.js';
export { HtmlReportGenerator } from './html-report.js';

// Redaction utilities
export { redactRequest, redactResponse } from './redact.js';

// Console formatter
export { ConsoleFormatter } from './console-formatter.js';
