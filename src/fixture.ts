import { test as base, APIRequestContext, APIResponse } from '@playwright/test';
import type { ApiSpy, ApiSpyConfig, CapturedRequest } from './types.js';
import { ApiSpyInstance, globalApiSpyStore } from './api-spy.js';
import { JsonReportGenerator } from './json-report.js';
import { HtmlReportGenerator } from './html-report.js';

/**
 * Extended fixture types
 */
export type ApiSpyFixtures = {
  apiSpy: ApiSpy;
};

/**
 * Fetch options with method
 */
interface FetchOptions {
  method?: string;
  headers?: Record<string, string> | Headers | [string, string][];
  data?: unknown;
  [key: string]: unknown;
}

/**
 * Creates APIRequestContext wrapper that intercepts requests
 */
function createApiRequestContextProxy(
  context: APIRequestContext,
  spy: ApiSpyInstance
): APIRequestContext {
  const methodsToIntercept = ['get', 'post', 'put', 'patch', 'delete', 'head', 'fetch'] as const;
  
  const handler: ProxyHandler<APIRequestContext> = {
    get(target, prop) {
      const originalValue = Reflect.get(target, prop);
      
      if (typeof prop === 'string' && methodsToIntercept.includes(prop as typeof methodsToIntercept[number])) {
        return async function(url: string, options?: FetchOptions) {
          const method = prop === 'fetch' ? (options?.method || 'GET') : prop.toUpperCase();
          const startTime = Date.now();
          
          // Collect headers
          const headers: Record<string, string> = {};
          if (options?.headers) {
            if (options.headers instanceof Headers) {
              options.headers.forEach((value, key) => {
                headers[key] = value;
              });
            } else if (Array.isArray(options.headers)) {
              for (const [key, value] of options.headers) {
                headers[key] = value;
              }
            } else {
              Object.assign(headers, options.headers);
            }
          }
          
          // Capture request
          const capturedRequest = await spy.captureRequest(method, url, {
            headers,
            data: options?.data,
          });
          
          try {
            // Execute original request
            const response: APIResponse = await (originalValue as Function).call(target, url, options);
            
            // Capture response
            if (capturedRequest) {
              const duration = Date.now() - startTime;
              
              // Get response body
              let responseBody: unknown;
              try {
                responseBody = await response.json();
              } catch {
                try {
                  responseBody = await response.text();
                } catch {
                  responseBody = undefined;
                }
              }
              
              // Collect response headers
              const responseHeaders: Record<string, string> = {};
              const headersObj = response.headers();
              for (const [key, value] of Object.entries(headersObj)) {
                responseHeaders[key] = value;
              }
              
              await spy.captureResponse(
                capturedRequest,
                {
                  status: response.status(),
                  statusText: response.statusText(),
                  headers: responseHeaders,
                  body: responseBody,
                },
                duration
              );
            }
            
            return response;
          } catch (error) {
            // Capture error
            if (capturedRequest) {
              await spy.captureError(capturedRequest, error as Error);
            }
            throw error;
          }
        };
      }
      
      // Return original value for other properties
      if (typeof originalValue === 'function') {
        return originalValue.bind(target);
      }
      return originalValue;
    }
  };
  
  return new Proxy(context, handler);
}

/**
 * Symbol for storing original request()
 */
const ORIGINAL_REQUEST = Symbol('originalRequest');

/**
 * Creates apiSpy fixture
 */
export const test = base.extend<ApiSpyFixtures>({
  apiSpy: async ({ request }, use, testInfo) => {
    // Get config from global store
    const config = globalApiSpyStore.config;
    
    // Create new spy instance for this test
    const spy = new ApiSpyInstance(config);
    
    // Set test information
    spy.setTestInfo({
      title: testInfo.title,
      file: testInfo.file,
      line: testInfo.line,
    });
    
    // Replace original request context with proxy
    const proxiedRequest = createApiRequestContextProxy(request, spy);
    
    // Replace request in testInfo so tests use proxy
    // @ts-expect-error - modifying private field
    testInfo._request = proxiedRequest;
    
    // Use fixture
    await use(spy);
    
    // After test, add entries to global store
    const entries = spy.getEntriesForReport();
    globalApiSpyStore.addEntries(entries);
    
    // Attach to Playwright report if enabled
    if (config.attachToPlaywrightReport && entries.length > 0) {
      const attachmentContent = JSON.stringify(entries, null, 2);
      await testInfo.attach('api-spy-requests', {
        body: Buffer.from(attachmentContent),
        contentType: 'application/json',
      });
    }
  },
});

/**
 * Extended fixture with automatic request interception
 */
export const testWithApiSpy = base.extend<ApiSpyFixtures & { request: APIRequestContext }>({
  apiSpy: async ({}, use, testInfo) => {
    const config = globalApiSpyStore.config;
    const spy = new ApiSpyInstance(config);
    
    spy.setTestInfo({
      title: testInfo.title,
      file: testInfo.file,
      line: testInfo.line,
    });
    
    await use(spy);
    
    const entries = spy.getEntriesForReport();
    globalApiSpyStore.addEntries(entries);
    
    // Attach to Playwright report if enabled
    if (config.attachToPlaywrightReport && entries.length > 0) {
      const attachmentContent = JSON.stringify(entries, null, 2);
      await testInfo.attach('api-spy-requests', {
        body: Buffer.from(attachmentContent),
        contentType: 'application/json',
      });
    }
  },
  
  request: async ({ request, apiSpy }, use) => {
    // Create proxy for request context
    const proxiedRequest = createApiRequestContextProxy(request, apiSpy as ApiSpyInstance);
    await use(proxiedRequest);
  },
});

/**
 * Reporter for generating reports after tests complete
 */
export class ApiSpyReporter {
  private jsonGenerator = new JsonReportGenerator();
  private htmlGenerator = new HtmlReportGenerator();
  
  async onEnd(): Promise<void> {
    const config = globalApiSpyStore.config;
    const entries = globalApiSpyStore.getAllEntries();
    
    if (entries.length === 0) {
      return;
    }
    
    // Generate JSON report
    if (config.jsonReport.enabled) {
      await this.jsonGenerator.save(entries, config.jsonReport);
    }
    
    // Generate HTML report
    if (config.htmlReport.enabled) {
      await this.htmlGenerator.save(entries, config.htmlReport);
    }
    
    // Clear store
    globalApiSpyStore.clear();
  }
}

export { expect } from '@playwright/test';
