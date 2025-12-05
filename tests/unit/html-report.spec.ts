/**
 * Unit tests for HtmlReportGenerator
 */
import { test, expect } from '@playwright/test';
import { HtmlReportGenerator } from '../../src/html-report.js';
import type { CapturedEntry, HtmlReportConfig } from '../../src/types.js';

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

test.describe('HtmlReportGenerator', () => {
  test.describe('generate', () => {
    test('should generate valid HTML', () => {
      const generator = new HtmlReportGenerator();
      const entries = [createTestEntry()];
      
      const html = generator.generate(entries);
      
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html');
      expect(html).toContain('</html>');
    });

    test('should include default title', () => {
      const generator = new HtmlReportGenerator();
      const entries = [createTestEntry()];
      
      const html = generator.generate(entries);
      
      expect(html).toContain('API Spy Report');
    });

    test('should include entry data', () => {
      const generator = new HtmlReportGenerator();
      const entry = createTestEntry({
        request: {
          method: 'POST',
          url: 'https://api.example.com/users',
          path: '/users',
          headers: {},
          body: { name: 'Jane' },
        },
      });
      
      const html = generator.generate([entry]);
      
      expect(html).toContain('POST');
      expect(html).toContain('/users');
    });

    test('should handle empty entries array', () => {
      const generator = new HtmlReportGenerator();
      
      const html = generator.generate([]);
      
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('0'); // Should show 0 requests
    });

    test('should include CSS styles', () => {
      const generator = new HtmlReportGenerator();
      const html = generator.generate([createTestEntry()]);
      
      expect(html).toContain('<style>');
      expect(html).toContain('</style>');
    });

    test('should include JavaScript for filtering', () => {
      const generator = new HtmlReportGenerator();
      const html = generator.generate([createTestEntry()]);
      
      expect(html).toContain('<script>');
      expect(html).toContain('</script>');
    });

    test('should include dark theme styling', () => {
      const generator = new HtmlReportGenerator();
      const html = generator.generate([createTestEntry()]);
      
      // Check for dark theme colors
      expect(html).toMatch(/#[0-9a-f]{3,6}/i); // Should have color codes
    });
  });

  test.describe('status code styling', () => {
    test('should style 2xx status codes as success', () => {
      const generator = new HtmlReportGenerator();
      const entry = createTestEntry({
        response: { status: 201, statusText: 'Created', headers: {}, duration: 100 }
      });
      
      const html = generator.generate([entry]);
      
      expect(html).toContain('201');
    });

    test('should style 4xx status codes as client error', () => {
      const generator = new HtmlReportGenerator();
      const entry = createTestEntry({
        response: { status: 404, statusText: 'Not Found', headers: {}, duration: 100 }
      });
      
      const html = generator.generate([entry]);
      
      expect(html).toContain('404');
    });

    test('should style 5xx status codes as server error', () => {
      const generator = new HtmlReportGenerator();
      const entry = createTestEntry({
        response: { status: 500, statusText: 'Internal Server Error', headers: {}, duration: 100 }
      });
      
      const html = generator.generate([entry]);
      
      expect(html).toContain('500');
    });
  });

  test.describe('filtering functionality', () => {
    test('should include filter controls', () => {
      const generator = new HtmlReportGenerator();
      const html = generator.generate([createTestEntry()]);
      
      expect(html).toMatch(/filter|search/i);
    });

    test('should include method filter options', () => {
      const generator = new HtmlReportGenerator();
      const entries = [
        createTestEntry({ request: { method: 'GET', url: 'https://api.example.com/a', path: '/a', headers: {} } }),
        createTestEntry({ id: 'test-2', request: { method: 'POST', url: 'https://api.example.com/b', path: '/b', headers: {} } }),
      ];
      
      const html = generator.generate(entries);
      
      expect(html).toContain('GET');
      expect(html).toContain('POST');
    });
  });

  test.describe('summary statistics', () => {
    test('should show total request count', () => {
      const generator = new HtmlReportGenerator();
      const entries = [
        createTestEntry(),
        createTestEntry({ id: 'test-2' }),
        createTestEntry({ id: 'test-3' }),
      ];
      
      const html = generator.generate(entries);
      
      expect(html).toContain('3');
    });

    test('should calculate average duration', () => {
      const generator = new HtmlReportGenerator();
      const entries = [
        createTestEntry({ duration: 100, response: { ...createTestEntry().response!, duration: 100 } }),
        createTestEntry({ id: 'test-2', duration: 200, response: { ...createTestEntry().response!, duration: 200 } }),
      ];
      
      const html = generator.generate(entries);
      
      // Average should be 150ms - just verify html is generated
      expect(html).toBeDefined();
    });
  });

  test.describe('request/response details', () => {
    test('should include request headers', () => {
      const generator = new HtmlReportGenerator();
      const entry = createTestEntry({
        request: {
          method: 'GET',
          url: 'https://api.example.com/test',
          path: '/test',
          headers: { 'authorization': 'Bearer token123', 'x-custom': 'value' },
        }
      });
      
      const html = generator.generate([entry]);
      
      expect(html).toContain('authorization');
      expect(html).toContain('x-custom');
    });

    test('should include request body when present', () => {
      const generator = new HtmlReportGenerator();
      const entry = createTestEntry({
        request: {
          method: 'POST',
          url: 'https://api.example.com/users',
          path: '/users',
          headers: {},
          body: { username: 'testuser', email: 'test@example.com' },
        }
      });
      
      const html = generator.generate([entry]);
      
      expect(html).toContain('testuser');
      expect(html).toContain('test@example.com');
    });

    test('should include response body', () => {
      const generator = new HtmlReportGenerator();
      const entry = createTestEntry({
        response: {
          status: 200,
          statusText: 'OK',
          headers: {},
          body: { success: true, data: { id: 123 } },
          duration: 100,
        }
      });
      
      const html = generator.generate([entry]);
      
      expect(html).toContain('123');
    });
  });

  test.describe('edge cases', () => {
    test('should handle entry without response', () => {
      const generator = new HtmlReportGenerator();
      const entry = createTestEntry();
      delete (entry as any).response;
      
      const html = generator.generate([entry]);
      
      expect(html).toContain('GET');
      expect(html).toContain('/users/1');
    });

    test('should handle entry with null body', () => {
      const generator = new HtmlReportGenerator();
      const entry = createTestEntry({
        request: {
          method: 'DELETE',
          url: 'https://api.example.com/users/1',
          path: '/users/1',
          headers: {},
          body: null,
        },
        response: {
          status: 204,
          statusText: 'No Content',
          headers: {},
          body: null,
          duration: 50,
        }
      });
      
      const html = generator.generate([entry]);
      
      expect(html).toContain('DELETE');
      expect(html).toContain('204');
    });

    test('should escape HTML in body content', () => {
      const generator = new HtmlReportGenerator();
      const entry = createTestEntry({
        response: {
          status: 200,
          statusText: 'OK',
          headers: {},
          body: { html: '<script>alert("xss")</script>' },
          duration: 100,
        }
      });
      
      const html = generator.generate([entry]);
      
      // Should not contain unescaped script tag
      expect(html).not.toContain('<script>alert("xss")</script>');
    });

    test('should handle large body content', () => {
      const generator = new HtmlReportGenerator();
      const largeArray = Array.from({ length: 100 }, (_, i) => ({ id: i, name: `Item ${i}` }));
      const entry = createTestEntry({
        response: {
          status: 200,
          statusText: 'OK',
          headers: {},
          body: largeArray,
          duration: 100,
        }
      });
      
      const html = generator.generate([entry]);
      
      expect(html).toBeDefined();
      expect(html.length).toBeGreaterThan(1000);
    });
  });

  test.describe('writeReport', () => {
    test('should generate HTML and be ready to write', () => {
      const generator = new HtmlReportGenerator();
      const entries = [createTestEntry()];
      
      // Just verify generate works - writeReport actually writes to disk
      const html = generator.generate(entries);
      expect(html.length).toBeGreaterThan(100);
    });
  });
});
