/**
 * E2E tests for report generation
 */
import { testWithApiSpy as test, expect } from '../../src/index.js';
import * as fs from 'fs';
import * as path from 'path';

test.describe('Report Generation E2E', () => {
  test('should generate report after multiple API calls', async ({ request, apiSpy }) => {
    // Make various API calls
    await request.get('/posts/1');
    await request.get('/posts/2');
    await request.post('/posts', {
      data: { title: 'New Post', body: 'Content', userId: 1 }
    });
    await request.put('/posts/1', {
      data: { id: 1, title: 'Updated', body: 'Updated Content', userId: 1 }
    });
    await request.delete('/posts/1');
    
    // Verify all requests were captured
    expect(apiSpy.requests).toHaveLength(5);
    
    // Check method distribution
    const methods = apiSpy.requests.map(r => r.method);
    expect(methods.filter(m => m === 'GET')).toHaveLength(2);
    expect(methods.filter(m => m === 'POST')).toHaveLength(1);
    expect(methods.filter(m => m === 'PUT')).toHaveLength(1);
    expect(methods.filter(m => m === 'DELETE')).toHaveLength(1);
  });

  test('should capture query parameters', async ({ request, apiSpy }) => {
    await request.get('/posts?userId=1&_limit=5');
    
    expect(apiSpy.lastRequest?.url).toContain('userId=1');
    expect(apiSpy.lastRequest?.url).toContain('_limit=5');
  });

  test('should capture request headers', async ({ request, apiSpy }) => {
    await request.get('/posts/1', {
      headers: {
        'X-Custom-Header': 'test-value',
        'Accept': 'application/json',
      }
    });
    
    const headers = apiSpy.lastRequest?.headers;
    expect(headers).toBeDefined();
    expect(headers?.['x-custom-header'] || headers?.['X-Custom-Header']).toBe('test-value');
  });

  test('should capture response headers', async ({ request, apiSpy }) => {
    await request.get('/posts/1');
    
    const headers = apiSpy.lastResponse?.headers;
    expect(headers).toBeDefined();
    // JSONPlaceholder returns content-type header
    expect(Object.keys(headers || {})).toContain('content-type');
  });

  test('should track duration for each request', async ({ request, apiSpy }) => {
    await request.get('/posts/1');
    
    const entry = apiSpy.entries[0];
    // Duration is on the response object
    expect(entry.response?.duration).toBeDefined();
    expect(entry.response?.duration).toBeGreaterThanOrEqual(0);
  });

  test('should capture response body', async ({ request, apiSpy }) => {
    await request.get('/users/1');
    
    const body = apiSpy.lastResponse?.body;
    expect(body).toBeDefined();
    expect(body.id).toBe(1);
    expect(body.name).toBeDefined();
    expect(body.email).toBeDefined();
  });

  test('should handle JSON request body', async ({ request, apiSpy }) => {
    const postData = {
      title: 'Test Title',
      body: 'Test Body Content',
      userId: 42,
    };
    
    await request.post('/posts', { data: postData });
    
    const requestBody = apiSpy.lastRequest?.body;
    expect(requestBody).toBeDefined();
    expect(requestBody.title).toBe('Test Title');
    expect(requestBody.userId).toBe(42);
  });
});

test.describe('API Spy Filtering E2E', () => {
  test('should capture all HTTP methods', async ({ request, apiSpy }) => {
    await request.get('/posts/1');
    await request.post('/posts', { data: { title: 'Test' } });
    await request.put('/posts/1', { data: { id: 1, title: 'Updated' } });
    await request.patch('/posts/1', { data: { title: 'Patched' } });
    await request.delete('/posts/1');
    
    const methods = apiSpy.requests.map(r => r.method);
    expect(methods).toContain('GET');
    expect(methods).toContain('POST');
    expect(methods).toContain('PUT');
    expect(methods).toContain('PATCH');
    expect(methods).toContain('DELETE');
  });

  test('should filter by status codes after the fact', async ({ request, apiSpy }) => {
    await request.get('/posts/1');        // 200
    await request.get('/posts/999999');   // 404
    await request.get('/posts/2');        // 200
    
    const successResponses = apiSpy.responses.filter(r => r.status >= 200 && r.status < 300);
    const errorResponses = apiSpy.responses.filter(r => r.status >= 400);
    
    expect(successResponses.length).toBeGreaterThanOrEqual(2);
    expect(errorResponses.length).toBeGreaterThanOrEqual(1);
  });

  test('should filter by path pattern after the fact', async ({ request, apiSpy }) => {
    await request.get('/posts/1');
    await request.get('/users/1');
    await request.get('/comments/1');
    
    const postRequests = apiSpy.requests.filter(r => r.path.includes('/posts'));
    const userRequests = apiSpy.requests.filter(r => r.path.includes('/users'));
    
    expect(postRequests).toHaveLength(1);
    expect(userRequests).toHaveLength(1);
  });
});

test.describe('API Spy Context E2E', () => {
  test('should track context across multiple requests', async ({ request, apiSpy }) => {
    apiSpy.addContext('Fetching user data');
    await request.get('/users/1');
    
    apiSpy.addContext('Fetching user posts');
    await request.get('/posts?userId=1');
    
    apiSpy.clearContext();
    await request.get('/posts/1');
    
    expect(apiSpy.entries[0].request.metadata?.context).toBe('Fetching user data');
    expect(apiSpy.entries[1].request.metadata?.context).toBe('Fetching user posts');
    expect(apiSpy.entries[2].request.metadata?.context).toBeUndefined();
  });

  test('should support multiple callbacks', async ({ request, apiSpy }) => {
    const requestUrls: string[] = [];
    const responseStatuses: number[] = [];
    
    apiSpy.onRequest((req) => {
      requestUrls.push(req.url);
    });
    
    apiSpy.onResponse((req, res) => {
      responseStatuses.push(res.status);
    });
    
    await request.get('/posts/1');
    await request.get('/posts/2');
    
    expect(requestUrls).toHaveLength(2);
    expect(responseStatuses).toHaveLength(2);
    expect(responseStatuses.every(s => s === 200)).toBe(true);
  });
});

test.describe('API Spy Clear and Reset E2E', () => {
  test('should clear all entries', async ({ request, apiSpy }) => {
    await request.get('/posts/1');
    await request.get('/posts/2');
    
    expect(apiSpy.entries).toHaveLength(2);
    
    apiSpy.clear();
    
    expect(apiSpy.entries).toHaveLength(0);
    expect(apiSpy.requests).toHaveLength(0);
    expect(apiSpy.responses).toHaveLength(0);
  });

  test('should continue capturing after clear', async ({ request, apiSpy }) => {
    await request.get('/posts/1');
    apiSpy.clear();
    await request.get('/posts/2');
    
    expect(apiSpy.entries).toHaveLength(1);
    expect(apiSpy.lastRequest?.path).toBe('/posts/2');
  });

  test('should handle pause, clear, resume sequence', async ({ request, apiSpy }) => {
    await request.get('/posts/1');
    apiSpy.pause();
    await request.get('/posts/2');
    apiSpy.clear();
    apiSpy.resume();
    await request.get('/posts/3');
    
    expect(apiSpy.entries).toHaveLength(1);
    expect(apiSpy.lastRequest?.path).toBe('/posts/3');
  });
});
