import { test, expect } from '@playwright/test';
import { JsonReportGenerator } from '../../src/json-report.js';
import type { CapturedEntry } from '../../src/types.js';

test.describe('JsonReportGenerator', () => {
  const generator = new JsonReportGenerator();

  test('should generate report with correct structure', () => {
    const entries: CapturedEntry[] = [
      {
        request: {
          id: '1',
          method: 'GET',
          url: 'https://api.example.com/users',
          path: '/users',
          headers: {},
          timestamp: Date.now(),
        },
        response: {
          status: 200,
          statusText: 'OK',
          headers: {},
          body: { data: [] },
          duration: 150,
        },
      },
    ];

    const report = generator.generate(entries);

    expect(report.version).toBe('1.0.0');
    expect(report.generatedAt).toBeDefined();
    expect(report.summary).toBeDefined();
    expect(report.entries).toHaveLength(1);
  });

  test('should calculate summary statistics', () => {
    const entries: CapturedEntry[] = [
      {
        request: {
          id: '1',
          method: 'GET',
          url: 'https://api.example.com/users',
          path: '/users',
          headers: {},
          timestamp: Date.now(),
        },
        response: {
          status: 200,
          statusText: 'OK',
          headers: {},
          duration: 100,
        },
      },
      {
        request: {
          id: '2',
          method: 'POST',
          url: 'https://api.example.com/users',
          path: '/users',
          headers: {},
          timestamp: Date.now(),
        },
        response: {
          status: 201,
          statusText: 'Created',
          headers: {},
          duration: 200,
        },
      },
      {
        request: {
          id: '3',
          method: 'GET',
          url: 'https://api.example.com/error',
          path: '/error',
          headers: {},
          timestamp: Date.now(),
        },
        response: {
          status: 500,
          statusText: 'Internal Server Error',
          headers: {},
          duration: 50,
        },
      },
    ];

    const report = generator.generate(entries);

    expect(report.summary.totalRequests).toBe(3);
    expect(report.summary.successfulRequests).toBe(2);
    expect(report.summary.failedRequests).toBe(1);
    expect(report.summary.avgDuration).toBe(117); // (100 + 200 + 50) / 3 rounded
    expect(report.summary.minDuration).toBe(50);
    expect(report.summary.maxDuration).toBe(200);
  });

  test('should handle empty entries', () => {
    const report = generator.generate([]);

    expect(report.summary.totalRequests).toBe(0);
    expect(report.summary.successfulRequests).toBe(0);
    expect(report.summary.failedRequests).toBe(0);
    expect(report.summary.avgDuration).toBe(0);
    expect(report.summary.minDuration).toBe(0);
    expect(report.summary.maxDuration).toBe(0);
  });

  test('should count errors as failures', () => {
    const entries: CapturedEntry[] = [
      {
        request: {
          id: '1',
          method: 'GET',
          url: 'https://api.example.com/users',
          path: '/users',
          headers: {},
          timestamp: Date.now(),
        },
        error: {
          message: 'Network error',
          stack: 'Error: Network error\n    at ...',
        },
      },
    ];

    const report = generator.generate(entries);

    expect(report.summary.totalRequests).toBe(1);
    expect(report.summary.failedRequests).toBe(1);
    expect(report.summary.successfulRequests).toBe(0);
  });
});
