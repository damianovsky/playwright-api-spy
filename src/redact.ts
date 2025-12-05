import type { CapturedRequest, CapturedResponse, RedactConfig } from './types.js';

/**
 * Default redaction values
 */
const DEFAULT_REDACT: Required<RedactConfig> = {
  headers: [],
  bodyFields: [],
  replacement: '[REDACTED]',
};

/**
 * Checks if header name matches pattern (case-insensitive)
 */
function matchesHeader(headerName: string, patterns: string[]): boolean {
  const lowerName = headerName.toLowerCase();
  return patterns.some((pattern) => lowerName === pattern.toLowerCase());
}

/**
 * Recursively redacts fields in JSON object
 */
function redactFields(
  obj: unknown,
  fieldsToRedact: string[],
  replacement: string
): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => redactFields(item, fieldsToRedact, replacement));
  }

  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      const shouldRedact = fieldsToRedact.some(
        (field) => lowerKey === field.toLowerCase() || lowerKey.includes(field.toLowerCase())
      );

      if (shouldRedact && typeof value === 'string') {
        result[key] = replacement;
      } else {
        result[key] = redactFields(value, fieldsToRedact, replacement);
      }
    }
    return result;
  }

  return obj;
}

/**
 * Redacts headers
 */
function redactHeaders(
  headers: Record<string, string>,
  headersToRedact: string[],
  replacement: string
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (matchesHeader(key, headersToRedact)) {
      result[key] = replacement;
    } else {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Redacts sensitive data from request
 */
export function redactRequest(
  request: CapturedRequest,
  config: RedactConfig = {}
): CapturedRequest {
  const redactConfig = {
    headers: config.headers ?? DEFAULT_REDACT.headers,
    bodyFields: config.bodyFields ?? DEFAULT_REDACT.bodyFields,
    replacement: config.replacement ?? DEFAULT_REDACT.replacement,
  };

  return {
    ...request,
    headers: redactHeaders(request.headers, redactConfig.headers, redactConfig.replacement),
    body: request.body
      ? redactFields(request.body, redactConfig.bodyFields, redactConfig.replacement)
      : undefined,
  };
}

/**
 * Redacts sensitive data from response
 */
export function redactResponse(
  response: CapturedResponse,
  config: RedactConfig = {}
): CapturedResponse {
  const redactConfig = {
    headers: config.headers ?? DEFAULT_REDACT.headers,
    bodyFields: config.bodyFields ?? DEFAULT_REDACT.bodyFields,
    replacement: config.replacement ?? DEFAULT_REDACT.replacement,
  };

  return {
    ...response,
    headers: redactHeaders(response.headers, redactConfig.headers, redactConfig.replacement),
    body: response.body
      ? redactFields(response.body, redactConfig.bodyFields, redactConfig.replacement)
      : undefined,
  };
}
