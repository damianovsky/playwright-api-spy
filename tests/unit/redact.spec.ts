import { test, expect } from '@playwright/test';
import { redactRequest, redactResponse } from '../../src/redact.js';
import type { CapturedRequest, CapturedResponse } from '../../src/types.js';

test.describe('Redact Module', () => {
  test.describe('redactRequest', () => {
    test('should redact specified headers', () => {
      const request: CapturedRequest = {
        id: '1',
        method: 'GET',
        url: 'https://api.example.com/users',
        path: '/users',
        headers: {
          'Authorization': 'Bearer secret-token',
          'Content-Type': 'application/json',
        },
        timestamp: Date.now(),
      };

      const redacted = redactRequest(request, {
        headers: ['Authorization'],
        replacement: '[REDACTED]',
      });

      expect(redacted.headers['Authorization']).toBe('[REDACTED]');
      expect(redacted.headers['Content-Type']).toBe('application/json');
    });

    test('should redact headers case-insensitively', () => {
      const request: CapturedRequest = {
        id: '1',
        method: 'GET',
        url: 'https://api.example.com/users',
        path: '/users',
        headers: {
          'authorization': 'Bearer secret-token',
          'AUTHORIZATION': 'Bearer another-token',
        },
        timestamp: Date.now(),
      };

      const redacted = redactRequest(request, {
        headers: ['Authorization'],
        replacement: '***',
      });

      expect(redacted.headers['authorization']).toBe('***');
    });

    test('should redact body fields', () => {
      const request: CapturedRequest = {
        id: '1',
        method: 'POST',
        url: 'https://api.example.com/users',
        path: '/users',
        headers: {},
        body: {
          username: 'john',
          password: 'secret123',
          email: 'john@example.com',
        },
        timestamp: Date.now(),
      };

      const redacted = redactRequest(request, {
        bodyFields: ['password'],
        replacement: '[HIDDEN]',
      });

      expect((redacted.body as Record<string, unknown>).username).toBe('john');
      expect((redacted.body as Record<string, unknown>).password).toBe('[HIDDEN]');
      expect((redacted.body as Record<string, unknown>).email).toBe('john@example.com');
    });

    test('should redact nested body fields', () => {
      const request: CapturedRequest = {
        id: '1',
        method: 'POST',
        url: 'https://api.example.com/users',
        path: '/users',
        headers: {},
        body: {
          user: {
            name: 'john',
            credentials: {
              password: 'secret123',
              token: 'abc123',
            },
          },
        },
        timestamp: Date.now(),
      };

      const redacted = redactRequest(request, {
        bodyFields: ['password', 'token'],
        replacement: '***',
      });

      const body = redacted.body as Record<string, unknown>;
      const user = body.user as Record<string, unknown>;
      const credentials = user.credentials as Record<string, unknown>;

      expect(credentials.password).toBe('***');
      expect(credentials.token).toBe('***');
    });

    test('should handle array body fields', () => {
      const request: CapturedRequest = {
        id: '1',
        method: 'POST',
        url: 'https://api.example.com/users',
        path: '/users',
        headers: {},
        body: [
          { name: 'user1', password: 'secret1' },
          { name: 'user2', password: 'secret2' },
        ],
        timestamp: Date.now(),
      };

      const redacted = redactRequest(request, {
        bodyFields: ['password'],
        replacement: '***',
      });

      const body = redacted.body as Array<Record<string, unknown>>;
      expect(body[0].password).toBe('***');
      expect(body[1].password).toBe('***');
    });

    test('should not modify request without body', () => {
      const request: CapturedRequest = {
        id: '1',
        method: 'GET',
        url: 'https://api.example.com/users',
        path: '/users',
        headers: {},
        timestamp: Date.now(),
      };

      const redacted = redactRequest(request, {
        bodyFields: ['password'],
      });

      expect(redacted.body).toBeUndefined();
    });
  });

  test.describe('redactResponse', () => {
    test('should redact response headers', () => {
      const response: CapturedResponse = {
        status: 200,
        statusText: 'OK',
        headers: {
          'Set-Cookie': 'session=abc123',
          'Content-Type': 'application/json',
        },
        body: { data: 'test' },
        duration: 100,
      };

      const redacted = redactResponse(response, {
        headers: ['Set-Cookie'],
        replacement: '[REDACTED]',
      });

      expect(redacted.headers['Set-Cookie']).toBe('[REDACTED]');
      expect(redacted.headers['Content-Type']).toBe('application/json');
    });

    test('should redact response body fields', () => {
      const response: CapturedResponse = {
        status: 200,
        statusText: 'OK',
        headers: {},
        body: {
          user: {
            name: 'john',
            accessToken: 'secret-token',
          },
        },
        duration: 100,
      };

      const redacted = redactResponse(response, {
        bodyFields: ['accessToken'],
        replacement: '***',
      });

      const body = redacted.body as Record<string, unknown>;
      const user = body.user as Record<string, unknown>;
      expect(user.accessToken).toBe('***');
    });
  });
});
