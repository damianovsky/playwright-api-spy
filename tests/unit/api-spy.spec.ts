import { test, expect } from '@playwright/test';
import { ApiSpyInstance } from '../../src/api-spy.js';
import type { ApiSpyConfig } from '../../src/types.js';

test.describe('ApiSpyInstance', () => {
  test('should initialize with default config', () => {
    const spy = new ApiSpyInstance();
    expect(spy.config.console).toBe(false);
    expect(spy.config.verbosity).toBe('normal');
  });

  test('should merge custom config', () => {
    const spy = new ApiSpyInstance({
      console: true,
      verbosity: 'verbose',
    });
    expect(spy.config.console).toBe(true);
    expect(spy.config.verbosity).toBe('verbose');
  });

  test('should start with empty entries', () => {
    const spy = new ApiSpyInstance();
    expect(spy.entries).toHaveLength(0);
    expect(spy.requests).toHaveLength(0);
    expect(spy.lastRequest).toBeUndefined();
    expect(spy.lastResponse).toBeUndefined();
  });

  test('should capture request', async () => {
    const spy = new ApiSpyInstance({ console: false });
    
    const request = await spy.captureRequest('GET', 'https://api.example.com/users', {
      headers: { 'Content-Type': 'application/json' },
    });

    expect(request).not.toBeNull();
    expect(request!.method).toBe('GET');
    expect(request!.path).toBe('/users');
    expect(request!.headers['Content-Type']).toBe('application/json');
  });

  test('should capture response', async () => {
    const spy = new ApiSpyInstance({ console: false });
    
    const request = await spy.captureRequest('GET', 'https://api.example.com/users');
    expect(request).not.toBeNull();

    await spy.captureResponse(request!, {
      status: 200,
      statusText: 'OK',
      headers: { 'Content-Type': 'application/json' },
      body: { data: [] },
    }, 150);

    expect(spy.entries).toHaveLength(1);
    expect(spy.lastResponse?.status).toBe(200);
    expect(spy.lastResponse?.duration).toBe(150);
  });

  test('should capture error', async () => {
    const spy = new ApiSpyInstance({ console: false });
    
    const request = await spy.captureRequest('GET', 'https://api.example.com/users');
    expect(request).not.toBeNull();

    const error = new Error('Network error');
    await spy.captureError(request!, error);

    expect(spy.entries).toHaveLength(1);
    expect(spy.lastEntry?.error?.message).toBe('Network error');
  });

  test('should respect pause/resume', async () => {
    const spy = new ApiSpyInstance({ console: false });
    
    expect(spy.isPaused).toBe(false);
    
    spy.pause();
    expect(spy.isPaused).toBe(true);
    
    const request = await spy.captureRequest('GET', 'https://api.example.com/users');
    expect(request).toBeNull();
    
    spy.resume();
    expect(spy.isPaused).toBe(false);
    
    const request2 = await spy.captureRequest('GET', 'https://api.example.com/users');
    expect(request2).not.toBeNull();
  });

  test('should clear entries', async () => {
    const spy = new ApiSpyInstance({ console: false });
    
    const request = await spy.captureRequest('GET', 'https://api.example.com/users');
    await spy.captureResponse(request!, {
      status: 200,
      statusText: 'OK',
      headers: {},
    }, 100);

    expect(spy.entries).toHaveLength(1);
    
    spy.clear();
    
    expect(spy.entries).toHaveLength(0);
    expect(spy.requests).toHaveLength(0);
  });

  test('should add and clear context', async () => {
    const spy = new ApiSpyInstance({ console: false });
    
    spy.addContext('Test context');
    const request = await spy.captureRequest('GET', 'https://api.example.com/users');
    
    expect(request?.metadata?.context).toBe('Test context');
    
    spy.clearContext();
    const request2 = await spy.captureRequest('GET', 'https://api.example.com/users2');
    
    expect(request2?.metadata?.context).toBeUndefined();
  });

  test('should filter by method', async () => {
    const spy = new ApiSpyInstance({
      console: false,
      filter: {
        methods: ['POST', 'PUT'],
      },
    });
    
    const getRequest = await spy.captureRequest('GET', 'https://api.example.com/users');
    expect(getRequest).toBeNull();
    
    const postRequest = await spy.captureRequest('POST', 'https://api.example.com/users');
    expect(postRequest).not.toBeNull();
  });

  test('should filter by excludePaths', async () => {
    const spy = new ApiSpyInstance({
      console: false,
      filter: {
        excludePaths: ['/health', '/metrics'],
      },
    });
    
    const healthRequest = await spy.captureRequest('GET', 'https://api.example.com/health');
    expect(healthRequest).toBeNull();
    
    const usersRequest = await spy.captureRequest('GET', 'https://api.example.com/users');
    expect(usersRequest).not.toBeNull();
  });

  test('should filter by includePaths', async () => {
    const spy = new ApiSpyInstance({
      console: false,
      filter: {
        includePaths: ['/api/'],
      },
    });
    
    const rootRequest = await spy.captureRequest('GET', 'https://api.example.com/users');
    expect(rootRequest).toBeNull();
    
    const apiRequest = await spy.captureRequest('GET', 'https://api.example.com/api/users');
    expect(apiRequest).not.toBeNull();
  });

  test('should call onRequest callback', async () => {
    const spy = new ApiSpyInstance({ console: false });
    
    let callbackCalled = false;
    let capturedPath = '';
    
    spy.onRequest((req) => {
      callbackCalled = true;
      capturedPath = req.path;
    });
    
    await spy.captureRequest('GET', 'https://api.example.com/users');
    
    expect(callbackCalled).toBe(true);
    expect(capturedPath).toBe('/users');
  });

  test('should call onResponse callback', async () => {
    const spy = new ApiSpyInstance({ console: false });
    
    let callbackCalled = false;
    let capturedStatus = 0;
    
    spy.onResponse((req, res) => {
      callbackCalled = true;
      capturedStatus = res.status;
    });
    
    const request = await spy.captureRequest('GET', 'https://api.example.com/users');
    await spy.captureResponse(request!, {
      status: 200,
      statusText: 'OK',
      headers: {},
    }, 100);
    
    expect(callbackCalled).toBe(true);
    expect(capturedStatus).toBe(200);
  });

  test('should call onError callback', async () => {
    const spy = new ApiSpyInstance({ console: false });
    
    let callbackCalled = false;
    let capturedMessage = '';
    
    spy.onError((req, error) => {
      callbackCalled = true;
      capturedMessage = error.message;
    });
    
    const request = await spy.captureRequest('GET', 'https://api.example.com/users');
    await spy.captureError(request!, new Error('Test error'));
    
    expect(callbackCalled).toBe(true);
    expect(capturedMessage).toBe('Test error');
  });

  test('should set test info', async () => {
    const spy = new ApiSpyInstance({ console: false });
    
    spy.setTestInfo({
      title: 'Test title',
      file: 'test.spec.ts',
      line: 42,
    });
    
    const request = await spy.captureRequest('GET', 'https://api.example.com/users');
    
    expect(request?.testInfo?.title).toBe('Test title');
    expect(request?.testInfo?.file).toBe('test.spec.ts');
    expect(request?.testInfo?.line).toBe(42);
  });
});
