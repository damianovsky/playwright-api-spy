import type { PlaywrightTestConfig } from '@playwright/test';
import type { ApiSpyConfig, PlaywrightTestConfigWithApiSpy } from './types.js';
import { DEFAULT_CONFIG } from './types.js';
import { globalApiSpyStore } from './api-spy.js';

/**
 * Merges API Spy config with default values
 */
function mergeApiSpyConfig(config: ApiSpyConfig = {}): Required<ApiSpyConfig> {
  return {
    console: config.console ?? DEFAULT_CONFIG.console,
    verbosity: config.verbosity ?? DEFAULT_CONFIG.verbosity,
    colors: config.colors ?? DEFAULT_CONFIG.colors,
    maxBodyLength: config.maxBodyLength ?? DEFAULT_CONFIG.maxBodyLength,
    attachToPlaywrightReport: config.attachToPlaywrightReport ?? DEFAULT_CONFIG.attachToPlaywrightReport,
    htmlReport: {
      enabled: config.htmlReport?.enabled ?? DEFAULT_CONFIG.htmlReport.enabled,
      outputDir: config.htmlReport?.outputDir ?? DEFAULT_CONFIG.htmlReport.outputDir,
      filename: config.htmlReport?.filename ?? DEFAULT_CONFIG.htmlReport.filename,
    },
    jsonReport: {
      enabled: config.jsonReport?.enabled ?? DEFAULT_CONFIG.jsonReport.enabled,
      outputDir: config.jsonReport?.outputDir ?? DEFAULT_CONFIG.jsonReport.outputDir,
      filename: config.jsonReport?.filename ?? DEFAULT_CONFIG.jsonReport.filename,
    },
    redact: {
      headers: config.redact?.headers ?? DEFAULT_CONFIG.redact.headers,
      bodyFields: config.redact?.bodyFields ?? DEFAULT_CONFIG.redact.bodyFields,
      replacement: config.redact?.replacement ?? DEFAULT_CONFIG.redact.replacement,
    },
    filter: {
      includePaths: config.filter?.includePaths ?? DEFAULT_CONFIG.filter.includePaths,
      excludePaths: config.filter?.excludePaths ?? DEFAULT_CONFIG.filter.excludePaths,
      methods: config.filter?.methods ?? DEFAULT_CONFIG.filter.methods,
    },
  };
}

/**
 * Playwright config wrapper that adds API Spy
 * 
 * @example
 * ```typescript
 * // playwright.config.ts
 * import { defineConfig } from '@playwright/test';
 * import { withApiSpy } from 'playwright-api-spy';
 * 
 * export default defineConfig(withApiSpy({
 *   console: true,
 *   verbosity: 'normal',
 *   htmlReport: { enabled: true },
 * }));
 * ```
 */
export function withApiSpy<T extends PlaywrightTestConfig>(
  playwrightConfig: T,
  apiSpyConfig?: ApiSpyConfig
): T & PlaywrightTestConfigWithApiSpy;

/**
 * Overload: allows calling withApiSpy with only API Spy config
 */
export function withApiSpy(
  apiSpyConfig: ApiSpyConfig
): PlaywrightTestConfigWithApiSpy;

/**
 * Implementation
 */
export function withApiSpy<T extends PlaywrightTestConfig>(
  configOrApiSpy: T | ApiSpyConfig,
  apiSpyConfig?: ApiSpyConfig
): T & PlaywrightTestConfigWithApiSpy {
  let playwrightConfig: T;
  let spyConfig: ApiSpyConfig;

  // Check which overload was used
  if (apiSpyConfig !== undefined) {
    // First overload: withApiSpy(playwrightConfig, apiSpyConfig)
    playwrightConfig = configOrApiSpy as T;
    spyConfig = apiSpyConfig;
  } else if ('console' in configOrApiSpy || 'verbosity' in configOrApiSpy || 
             'htmlReport' in configOrApiSpy || 'jsonReport' in configOrApiSpy ||
             'redact' in configOrApiSpy || 'filter' in configOrApiSpy) {
    // Second overload: withApiSpy(apiSpyConfig)
    playwrightConfig = {} as T;
    spyConfig = configOrApiSpy as ApiSpyConfig;
  } else {
    // First overload with default API Spy config
    playwrightConfig = configOrApiSpy as T;
    spyConfig = {};
  }

  // Merge API Spy config
  const mergedApiSpyConfig = mergeApiSpyConfig(spyConfig);
  
  // Clear previous data and set config in global store
  globalApiSpyStore.reset();
  globalApiSpyStore.setConfig(mergedApiSpyConfig);

  return {
    ...playwrightConfig,
    apiSpy: mergedApiSpyConfig,
  } as T & PlaywrightTestConfigWithApiSpy;
}

/**
 * Helper function for defining API Spy config
 * 
 * @example
 * ```typescript
 * import { defineConfig } from '@playwright/test';
 * import { defineApiSpyConfig } from 'playwright-api-spy';
 * 
 * const apiSpyConfig = defineApiSpyConfig({
 *   console: true,
 *   redact: {
 *     headers: ['Authorization'],
 *     bodyFields: ['password'],
 *   },
 * });
 * 
 * export default defineConfig(withApiSpy(apiSpyConfig));
 * ```
 */
export function defineApiSpyConfig(config: ApiSpyConfig): Required<ApiSpyConfig> {
  return mergeApiSpyConfig(config);
}

/**
 * Gets the current API Spy configuration from the global store.
 * 
 * This is useful when creating custom fixtures that need access to the config
 * set via `withApiSpy()`.
 * 
 * @returns The current API Spy configuration
 * 
 * @example
 * ```typescript
 * import { getApiSpyConfig, ApiSpyInstance } from 'playwright-api-spy';
 * 
 * export const test = baseTest.extend({
 *   customApiSpy: async ({}, use, testInfo) => {
 *     const config = getApiSpyConfig();
 *     const spy = new ApiSpyInstance(config);
 *     // ...
 *   },
 * });
 * ```
 */
export function getApiSpyConfig(): Required<ApiSpyConfig> {
  return globalApiSpyStore.config;
}
