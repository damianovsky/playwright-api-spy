/**
 * Unit tests for ConsoleFormatter
 */
import { test, expect } from '@playwright/test';
import { ConsoleFormatter } from '../../src/console-formatter.js';
import { DEFAULT_CONFIG } from '../../src/types.js';
import type { CapturedEntry, ApiSpyConfig } from '../../src/types.js';

// Helper to create test entries
function createTestEntry(overrides: Partial<CapturedEntry> = {}): CapturedEntry {
  return {
    id: 'test-1',
    timestamp: new Date().toISOString(),
    duration: 150,
    request: {
      method: 'GET',
      url: 'https://api.example.com/users/1',
      path: '/users/1',
      headers: { 'content-type': 'application/json' },
    },
    response: {
      status: 200,
      statusText: 'OK',
      headers: { 'content-type': 'application/json' },
      body: { id: 1, name: 'John' },
      duration: 150,
    },
    ...overrides,
  };
}

// Helper to create a full config
function createConfig(overrides: Partial<ApiSpyConfig> = {}): Required<ApiSpyConfig> {
  return {
    ...DEFAULT_CONFIG,
    colors: false, // Disable colors for easier testing
    ...overrides,
  } as Required<ApiSpyConfig>;
}

// Helper to suppress console output during tests
function withSuppressedConsole(fn: () => void): void {
  const originalLog = console.log;
  console.log = () => {};
  try {
    fn();
  } finally {
    console.log = originalLog;
  }
}

test.describe('ConsoleFormatter', () => {
  test.describe('constructor', () => {
    test('should create formatter with config', () => {
      const config = createConfig();
      const formatter = new ConsoleFormatter(config);
      expect(formatter).toBeDefined();
    });

    test('should accept config with colors disabled', () => {
      const config = createConfig({ colors: false });
      const formatter = new ConsoleFormatter(config);
      expect(formatter).toBeDefined();
    });

    test('should accept config with verbosity levels', () => {
      const verbosityLevels = ['minimal', 'normal', 'detailed'] as const;
      
      for (const verbosity of verbosityLevels) {
        const config = createConfig({ verbosity });
        const formatter = new ConsoleFormatter(config);
        expect(formatter).toBeDefined();
      }
    });
  });

  test.describe('formatEntry', () => {
    test('should format entry without throwing', () => {
      const config = createConfig();
      const formatter = new ConsoleFormatter(config);
      const entry = createTestEntry();
      
      // formatEntry prints to console, so just verify it doesn't throw
      withSuppressedConsole(() => {
        expect(() => formatter.formatEntry(entry)).not.toThrow();
      });
    });

    test('should handle entry with error', () => {
      const config = createConfig();
      const formatter = new ConsoleFormatter(config);
      const entry = createTestEntry({
        error: { message: 'Network error', name: 'Error' }
      });
      
      withSuppressedConsole(() => {
        expect(() => formatter.formatEntry(entry)).not.toThrow();
      });
    });

    test('should handle entry without response', () => {
      const config = createConfig();
      const formatter = new ConsoleFormatter(config);
      const entry = createTestEntry();
      delete (entry as any).response;
      
      withSuppressedConsole(() => {
        expect(() => formatter.formatEntry(entry)).not.toThrow();
      });
    });

    test('should handle entry with context', () => {
      const config = createConfig();
      const formatter = new ConsoleFormatter(config);
      const entry = createTestEntry({
        request: {
          method: 'POST',
          url: 'https://api.example.com/users',
          path: '/users',
          headers: {},
          metadata: { context: 'Creating new user' },
        },
      });
      
      withSuppressedConsole(() => {
        expect(() => formatter.formatEntry(entry)).not.toThrow();
      });
    });

    test('should handle entry with test info', () => {
      const config = createConfig();
      const formatter = new ConsoleFormatter(config);
      const entry = createTestEntry({
        request: {
          method: 'GET',
          url: 'https://api.example.com/users',
          path: '/users',
          headers: {},
          testInfo: { file: 'test.spec.ts', title: 'should get users', line: 10 },
        },
      });
      
      withSuppressedConsole(() => {
        expect(() => formatter.formatEntry(entry)).not.toThrow();
      });
    });

    test('should handle different HTTP methods', () => {
      const config = createConfig();
      const formatter = new ConsoleFormatter(config);
      const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
      
      withSuppressedConsole(() => {
        for (const method of methods) {
          const entry = createTestEntry({
            request: {
              method,
              url: 'https://api.example.com/test',
              path: '/test',
              headers: {},
            }
          });
          
          expect(() => formatter.formatEntry(entry)).not.toThrow();
        }
      });
    });

    test('should handle different status codes', () => {
      const config = createConfig();
      const formatter = new ConsoleFormatter(config);
      const statusCodes = [200, 201, 301, 400, 404, 500, 503];
      
      withSuppressedConsole(() => {
        for (const status of statusCodes) {
          const entry = createTestEntry({
            response: { status, statusText: 'Test', headers: {}, duration: 100 }
          });
          
          expect(() => formatter.formatEntry(entry)).not.toThrow();
        }
      });
    });

    test('should handle verbose mode with headers', () => {
      const config = createConfig({ verbosity: 'verbose' });
      const formatter = new ConsoleFormatter(config);
      const entry = createTestEntry({
        request: {
          method: 'GET',
          url: 'https://api.example.com/users',
          path: '/users',
          headers: { 'authorization': 'Bearer token', 'x-custom': 'value' },
        }
      });
      
      withSuppressedConsole(() => {
        expect(() => formatter.formatEntry(entry)).not.toThrow();
      });
    });

    test('should handle minimal mode', () => {
      const config = createConfig({ verbosity: 'minimal' });
      const formatter = new ConsoleFormatter(config);
      const entry = createTestEntry();
      
      withSuppressedConsole(() => {
        expect(() => formatter.formatEntry(entry)).not.toThrow();
      });
    });
  });

  test.describe('formatSummary', () => {
    test('should format empty entries array without throwing', () => {
      const config = createConfig();
      const formatter = new ConsoleFormatter(config);
      
      withSuppressedConsole(() => {
        expect(() => formatter.formatSummary([])).not.toThrow();
      });
    });

    test('should format multiple entries without throwing', () => {
      const config = createConfig();
      const formatter = new ConsoleFormatter(config);
      const entries = [
        createTestEntry({ duration: 100 }),
        createTestEntry({ 
          id: 'test-2',
          duration: 200,
          response: { status: 404, statusText: 'Not Found', headers: {}, duration: 200 }
        }),
        createTestEntry({ id: 'test-3', duration: 150 }),
      ];
      
      withSuppressedConsole(() => {
        expect(() => formatter.formatSummary(entries)).not.toThrow();
      });
    });

    test('should handle entries with errors', () => {
      const config = createConfig();
      const formatter = new ConsoleFormatter(config);
      const entries = [
        createTestEntry(),
        createTestEntry({ 
          id: 'test-2',
          error: { message: 'Connection refused', name: 'Error' }
        }),
      ];
      
      withSuppressedConsole(() => {
        expect(() => formatter.formatSummary(entries)).not.toThrow();
      });
    });

    test('should handle entries with 5xx status codes', () => {
      const config = createConfig();
      const formatter = new ConsoleFormatter(config);
      const entries = [
        createTestEntry(),
        createTestEntry({ 
          id: 'test-2',
          response: { status: 500, statusText: 'Internal Server Error', headers: {}, duration: 100 }
        }),
      ];
      
      withSuppressedConsole(() => {
        expect(() => formatter.formatSummary(entries)).not.toThrow();
      });
    });
  });
});
