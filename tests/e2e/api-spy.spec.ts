import { testWithApiSpy as test, expect } from '../../src/index.js';

test.describe('API Spy Tests', () => {
  test('should capture GET request', async ({ request, apiSpy }) => {
    const response = await request.get('/posts/1');
    
    expect(response.ok()).toBeTruthy();
    expect(apiSpy.requests).toHaveLength(1);
    expect(apiSpy.lastRequest?.method).toBe('GET');
    expect(apiSpy.lastRequest?.path).toBe('/posts/1');
    expect(apiSpy.lastResponse?.status).toBe(200);
  });

  test('should capture POST request', async ({ request, apiSpy }) => {
    const response = await request.post('/posts', {
      data: {
        title: 'Test Post',
        body: 'Test Body',
        userId: 1,
        password: 'secret123', // Should be redacted
      },
    });

    expect(response.ok()).toBeTruthy();
    expect(apiSpy.requests).toHaveLength(1);
    expect(apiSpy.lastRequest?.method).toBe('POST');
    expect(apiSpy.lastResponse?.status).toBe(201);
  });

  test('should capture multiple requests', async ({ request, apiSpy }) => {
    await request.get('/posts/1');
    await request.get('/posts/2');
    await request.get('/users/1');

    expect(apiSpy.requests).toHaveLength(3);
    expect(apiSpy.requests[0].path).toBe('/posts/1');
    expect(apiSpy.requests[1].path).toBe('/posts/2');
    expect(apiSpy.requests[2].path).toBe('/users/1');
  });

  test('should support context', async ({ request, apiSpy }) => {
    apiSpy.addContext('Testing context feature');
    await request.get('/posts/1');
    
    expect(apiSpy.lastRequest?.metadata?.context).toBe('Testing context feature');
    
    apiSpy.clearContext();
    await request.get('/posts/2');
    
    expect(apiSpy.lastRequest?.metadata?.context).toBeUndefined();
  });

  test('should support pause/resume', async ({ request, apiSpy }) => {
    await request.get('/posts/1');
    expect(apiSpy.requests).toHaveLength(1);

    apiSpy.pause();
    await request.get('/posts/2'); // Should not be captured
    expect(apiSpy.requests).toHaveLength(1);

    apiSpy.resume();
    await request.get('/posts/3');
    expect(apiSpy.requests).toHaveLength(2);
  });

  test('should call onRequest hook', async ({ request, apiSpy }) => {
    let hookCalled = false;
    let capturedPath = '';

    apiSpy.onRequest((req) => {
      hookCalled = true;
      capturedPath = req.path;
    });

    await request.get('/posts/1');

    expect(hookCalled).toBe(true);
    expect(capturedPath).toBe('/posts/1');
  });

  test('should call onResponse hook', async ({ request, apiSpy }) => {
    let hookCalled = false;
    let capturedStatus = 0;

    apiSpy.onResponse((req, res) => {
      hookCalled = true;
      capturedStatus = res.status;
    });

    await request.get('/posts/1');

    expect(hookCalled).toBe(true);
    expect(capturedStatus).toBe(200);
  });

  test('should handle PUT request', async ({ request, apiSpy }) => {
    const response = await request.put('/posts/1', {
      data: {
        id: 1,
        title: 'Updated Title',
        body: 'Updated Body',
        userId: 1,
      },
    });

    expect(response.ok()).toBeTruthy();
    expect(apiSpy.lastRequest?.method).toBe('PUT');
  });

  test('should handle DELETE request', async ({ request, apiSpy }) => {
    const response = await request.delete('/posts/1');

    expect(response.ok()).toBeTruthy();
    expect(apiSpy.lastRequest?.method).toBe('DELETE');
  });

  test('should clear entries', async ({ request, apiSpy }) => {
    await request.get('/posts/1');
    await request.get('/posts/2');
    
    expect(apiSpy.requests).toHaveLength(2);
    
    apiSpy.clear();
    
    expect(apiSpy.requests).toHaveLength(0);
  });
});
