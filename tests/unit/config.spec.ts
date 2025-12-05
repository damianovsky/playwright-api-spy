/**
 * Unit tests for config functions
 */
import { test, expect } from '@playwright/test';
import { defineApiSpyConfig, DEFAULT_CONFIG } from '../../src/index.js';
import type { ApiSpyConfig } from '../../src/types.js';

test.describe('defineApiSpyConfig', () => {
  test('should merge with default config', () => {
    const config: ApiSpyConfig = {
      verbosity: 'normal',
    };
    
    const result = defineApiSpyConfig(config);
    
    // Should have the specified value
    expect(result.verbosity).toBe('normal');
    // Should have default values for unspecified fields
    expect(result.console).toBeDefined();
  });

  test('should provide defaults for empty config', () => {
    const config: ApiSpyConfig = {};
    
    const result = defineApiSpyConfig(config);
    
    // Should have all default values
    expect(result.console).toBe(DEFAULT_CONFIG.console);
    expect(result.verbosity).toBe(DEFAULT_CONFIG.verbosity);
    expect(result.colors).toBe(DEFAULT_CONFIG.colors);
  });

  test('should accept config with custom values', () => {
    const config: ApiSpyConfig = {
      verbosity: 'detailed',
      console: true,
      redact: {
        bodyFields: ['password', 'token'],
        headers: ['authorization'],
        replacement: '***',
      },
      filter: {
        methods: ['GET', 'POST'],
        includePaths: ['/api/*'],
        excludePaths: ['/health'],
      },
    };
    
    const result = defineApiSpyConfig(config);
    
    expect(result.verbosity).toBe('detailed');
    expect(result.console).toBe(true);
    expect(result.redact.bodyFields).toEqual(['password', 'token']);
    expect(result.redact.headers).toEqual(['authorization']);
  });

  test('should accept config with all verbosity levels', () => {
    const verbosityLevels: Array<'minimal' | 'normal' | 'detailed'> = [
      'minimal',
      'normal', 
      'detailed',
    ];
    
    for (const verbosity of verbosityLevels) {
      const config: ApiSpyConfig = { verbosity };
      const result = defineApiSpyConfig(config);
      expect(result.verbosity).toBe(verbosity);
    }
  });

  test('should preserve redact configuration', () => {
    const config: ApiSpyConfig = {
      redact: {
        bodyFields: ['secret', 'apiKey', 'ssn'],
        headers: ['x-api-key'],
        replacement: '[HIDDEN]',
      },
    };
    
    const result = defineApiSpyConfig(config);
    
    expect(result.redact.bodyFields).toEqual(['secret', 'apiKey', 'ssn']);
    expect(result.redact.headers).toEqual(['x-api-key']);
    expect(result.redact.replacement).toBe('[HIDDEN]');
  });

  test('should preserve filter configuration', () => {
    const config: ApiSpyConfig = {
      filter: {
        methods: ['POST', 'PUT', 'DELETE'],
        includePaths: ['/api/v1/*', '/api/v2/*'],
        excludePaths: ['/api/*/health', '/api/*/metrics'],
      },
    };
    
    const result = defineApiSpyConfig(config);
    
    expect(result.filter.methods).toEqual(['POST', 'PUT', 'DELETE']);
    expect(result.filter.includePaths).toHaveLength(2);
    expect(result.filter.excludePaths).toHaveLength(2);
  });

  test('should handle console flag', () => {
    expect(defineApiSpyConfig({ console: true }).console).toBe(true);
    expect(defineApiSpyConfig({ console: false }).console).toBe(false);
  });
});

test.describe('API Spy Configuration Validation', () => {
  test('filter methods should accept standard HTTP methods', () => {
    const config: ApiSpyConfig = {
      filter: {
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
      },
    };
    
    const result = defineApiSpyConfig(config);
    
    expect(result.filter.methods).toHaveLength(7);
  });

  test('redact bodyFields should preserve array values', () => {
    const config: ApiSpyConfig = {
      redact: {
        bodyFields: ['Password', 'password', 'PASSWORD'],
      },
    };
    
    const result = defineApiSpyConfig(config);
    
    expect(result.redact.bodyFields).toHaveLength(3);
  });

  test('path patterns should support wildcards', () => {
    const config: ApiSpyConfig = {
      filter: {
        includePaths: [
          '/api/*',
          '/api/v*/users',
          '*/health',
        ],
      },
    };
    
    const result = defineApiSpyConfig(config);
    
    expect(result.filter.includePaths).toHaveLength(3);
  });
});
