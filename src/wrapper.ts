import type { APIRequestContext, APIResponse } from '@playwright/test';
import type { ApiSpy, CapturedRequest } from './types.js';
import { ApiSpyInstance } from './api-spy.js';

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
 * Methods that can be intercepted on APIRequestContext
 */
const INTERCEPTABLE_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'fetch'] as const;

type InterceptableMethod = typeof INTERCEPTABLE_METHODS[number];

/**
 * Normalizes headers to a plain object
 */
function normalizeHeaders(headers?: FetchOptions['headers']): Record<string, string> {
  const result: Record<string, string> = {};
  
  if (!headers) {
    return result;
  }
  
  if (headers instanceof Headers) {
    headers.forEach((value, key) => {
      result[key] = value;
    });
  } else if (Array.isArray(headers)) {
    for (const [key, value] of headers) {
      result[key] = value;
    }
  } else {
    Object.assign(result, headers);
  }
  
  return result;
}

/**
 * Wraps an APIRequestContext with API Spy interception.
 * 
 * This function creates a proxy that intercepts all HTTP method calls
 * (get, post, put, patch, delete, head, fetch) and captures request/response
 * data through the provided API Spy instance.
 * 
 * @param apiContext - The original APIRequestContext to wrap
 * @param spy - The API Spy instance to use for capturing requests
 * @returns A proxied APIRequestContext that intercepts requests
 * 
 * @example
 * ```typescript
 * import { wrapWithApiSpy, ApiSpyInstance, getApiSpyConfig } from 'playwright-api-spy';
 * import { test as relayTest } from 'playwright-relay';
 * 
 * export const test = relayTest.extend<MyFixtures>({
 *   apiSpy: async ({}, use, testInfo) => {
 *     const spy = new ApiSpyInstance(getApiSpyConfig());
 *     spy.setTestInfo({ title: testInfo.title, file: testInfo.file });
 *     await use(spy);
 *     await spy.finalize(testInfo);
 *   },
 *   
 *   rawApi: async ({ request, apiSpy }, use) => {
 *     const wrappedRequest = wrapWithApiSpy(request, apiSpy);
 *     await use(wrappedRequest);
 *   },
 * });
 * ```
 */
export function wrapWithApiSpy(
  apiContext: APIRequestContext,
  spy: ApiSpy | ApiSpyInstance
): APIRequestContext {
  // Ensure we have an ApiSpyInstance for internal methods
  const spyInstance = spy as ApiSpyInstance;
  
  const handler: ProxyHandler<APIRequestContext> = {
    get(target, prop) {
      const originalValue = Reflect.get(target, prop);
      
      // Check if this is a method we should intercept
      if (typeof prop === 'string' && INTERCEPTABLE_METHODS.includes(prop as InterceptableMethod)) {
        return async function(url: string, options?: FetchOptions): Promise<APIResponse> {
          const method = prop === 'fetch' ? (options?.method || 'GET') : prop.toUpperCase();
          const startTime = Date.now();
          
          // Normalize headers
          const headers = normalizeHeaders(options?.headers);
          
          // Capture request
          const capturedRequest = await spyInstance.captureRequest(method, url, {
            headers,
            data: options?.data,
          });
          
          try {
            // Execute original request
            const response: APIResponse = await (originalValue as Function).call(target, url, options);
            
            // Capture response if request was captured
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
              
              await spyInstance.captureResponse(
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
            // Capture error if request was captured
            if (capturedRequest) {
              await spyInstance.captureError(capturedRequest, error as Error);
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
  
  return new Proxy(apiContext, handler);
}

/**
 * Type guard to check if an object is an APIRequestContext
 */
export function isAPIRequestContext(obj: unknown): obj is APIRequestContext {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }
  
  const context = obj as Record<string, unknown>;
  
  // Check for presence of key methods
  return (
    typeof context.get === 'function' &&
    typeof context.post === 'function' &&
    typeof context.put === 'function' &&
    typeof context.delete === 'function' &&
    typeof context.fetch === 'function'
  );
}
