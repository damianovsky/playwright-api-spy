import type { APIRequestContext, TestType, TestInfo } from '@playwright/test';
import type { ApiSpy } from './types.js';
import { ApiSpyInstance, globalApiSpyStore } from './api-spy.js';
import { wrapWithApiSpy } from './wrapper.js';

/**
 * Extended fixture types for API Spy
 */
export type ApiSpyFixtures = {
  apiSpy: ApiSpy;
};

/**
 * Extended fixture types with wrapped request
 */
export type ApiSpyFixturesWithRequest = ApiSpyFixtures & {
  request: APIRequestContext;
};

/**
 * Extends any Playwright test object with API Spy capabilities.
 * 
 * This function is designed to work with any test object, including those
 * extended by other libraries (e.g., playwright-relay, playwright-bdd).
 * 
 * @param baseTest - The test object to extend (from @playwright/test or another library)
 * @returns Extended test object with apiSpy fixture and wrapped request
 * 
 * @example
 * ```typescript
 * import { test as relayTest } from 'playwright-relay';
 * import { extendWithApiSpy } from 'playwright-api-spy';
 * 
 * // Extend relay test with API Spy
 * const testWithSpy = extendWithApiSpy(relayTest);
 * 
 * // Then extend with your own fixtures
 * export const test = testWithSpy.extend<MyFixtures>({
 *   myApi: async ({ request }, use) => {
 *     // request is now automatically wrapped with API Spy
 *     await use(new MyApi(request));
 *   },
 * });
 * ```
 */
export function extendWithApiSpy<
  TestArgs extends { request: APIRequestContext },
  WorkerArgs extends object
>(
  baseTest: TestType<TestArgs, WorkerArgs>
): TestType<TestArgs & ApiSpyFixtures, WorkerArgs> {
  // Use type assertion to work around Playwright's complex fixture types
  const extended = (baseTest as TestType<any, any>).extend({
    apiSpy: async ({}: object, use: (spy: ApiSpy) => Promise<void>, testInfo: TestInfo) => {
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
    
    // Override request fixture to wrap with API Spy
    request: async (
      { request, apiSpy }: { request: APIRequestContext; apiSpy: ApiSpy },
      use: (request: APIRequestContext) => Promise<void>
    ) => {
      const wrappedRequest = wrapWithApiSpy(request, apiSpy as ApiSpyInstance);
      await use(wrappedRequest);
    },
  });
  
  return extended as TestType<TestArgs & ApiSpyFixtures, WorkerArgs>;
}

/**
 * Creates API Spy fixtures without wrapping request automatically.
 * Use this when you need more control over how request is wrapped.
 * 
 * @param baseTest - The test object to extend
 * @returns Extended test object with apiSpy fixture only
 * 
 * @example
 * ```typescript
 * import { test as relayTest } from 'playwright-relay';
 * import { extendWithApiSpyFixture, wrapWithApiSpy } from 'playwright-api-spy';
 * 
 * const testWithSpy = extendWithApiSpyFixture(relayTest);
 * 
 * export const test = testWithSpy.extend<MyFixtures>({
 *   // Manually wrap only specific fixtures
 *   rawApi: async ({ request, apiSpy }, use) => {
 *     const wrapped = wrapWithApiSpy(request, apiSpy);
 *     await use(wrapped);
 *   },
 * });
 * ```
 */
export function extendWithApiSpyFixture<
  TestArgs extends object,
  WorkerArgs extends object
>(
  baseTest: TestType<TestArgs, WorkerArgs>
): TestType<TestArgs & ApiSpyFixtures, WorkerArgs> {
  // Use type assertion to work around Playwright's complex fixture types
  const extended = (baseTest as TestType<any, any>).extend({
    apiSpy: async ({}: object, use: (spy: ApiSpy) => Promise<void>, testInfo: TestInfo) => {
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
  });
  
  return extended as TestType<TestArgs & ApiSpyFixtures, WorkerArgs>;
}
