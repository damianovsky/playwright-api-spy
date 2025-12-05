import type {
  ApiSpyConfig,
  CapturedEntry,
  CapturedRequest,
  CapturedResponse,
  HttpMethod,
  OnRequestCallback,
  OnResponseCallback,
  OnErrorCallback,
  ApiSpy,
} from './types.js';
import { DEFAULT_CONFIG } from './types.js';
import { redactRequest, redactResponse } from './redact.js';
import { ConsoleFormatter } from './console-formatter.js';

/**
 * Generates unique ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Extracts path from URL
 */
function extractPath(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.pathname + urlObj.search;
  } catch {
    return url;
  }
}

/**
 * Checks if request matches filters
 */
function matchesFilter(
  method: HttpMethod,
  path: string,
  filter: NonNullable<ApiSpyConfig['filter']>
): boolean {
  // Check method
  if (filter.methods && filter.methods.length > 0) {
    if (!filter.methods.includes(method)) {
      return false;
    }
  }

  // Check excludePaths
  if (filter.excludePaths && filter.excludePaths.length > 0) {
    for (const pattern of filter.excludePaths) {
      const regex = new RegExp(pattern);
      if (regex.test(path)) {
        return false;
      }
    }
  }

  // Check includePaths (if specified, must match)
  if (filter.includePaths && filter.includePaths.length > 0) {
    let matches = false;
    for (const pattern of filter.includePaths) {
      const regex = new RegExp(pattern);
      if (regex.test(path)) {
        matches = true;
        break;
      }
    }
    if (!matches) {
      return false;
    }
  }

  return true;
}

/**
 * Parses body to object if JSON
 */
function parseBody(body: unknown): unknown {
  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch {
      return body;
    }
  }
  if (body instanceof Buffer) {
    try {
      const str = body.toString('utf-8');
      return JSON.parse(str);
    } catch {
      return body.toString('utf-8');
    }
  }
  return body;
}

/**
 * Truncates body to maximum length
 */
function truncateBody(body: unknown, maxLength: number): unknown {
  if (typeof body === 'string' && body.length > maxLength) {
    return body.substring(0, maxLength) + `... [truncated, ${body.length - maxLength} more chars]`;
  }
  if (typeof body === 'object' && body !== null) {
    const str = JSON.stringify(body);
    if (str.length > maxLength) {
      return JSON.parse(str.substring(0, maxLength) + '"}') as unknown;
    }
  }
  return body;
}

/**
 * ApiSpyInstance - main request capturing implementation
 */
export class ApiSpyInstance implements ApiSpy {
  private _entries: CapturedEntry[] = [];
  private _paused = false;
  private _context: string | undefined;
  private _onRequestCallbacks: OnRequestCallback[] = [];
  private _onResponseCallbacks: OnResponseCallback[] = [];
  private _onErrorCallbacks: OnErrorCallback[] = [];
  private _config: Required<ApiSpyConfig>;
  private _consoleFormatter: ConsoleFormatter;
  private _testInfo?: {
    title: string;
    file: string;
    line?: number;
  };

  constructor(config: ApiSpyConfig = {}) {
    this._config = this.mergeConfig(config);
    this._consoleFormatter = new ConsoleFormatter(this._config);
  }

  private mergeConfig(config: ApiSpyConfig): Required<ApiSpyConfig> {
    return {
      console: config.console ?? DEFAULT_CONFIG.console,
      verbosity: config.verbosity ?? DEFAULT_CONFIG.verbosity,
      colors: config.colors ?? DEFAULT_CONFIG.colors,
      maxBodyLength: config.maxBodyLength ?? DEFAULT_CONFIG.maxBodyLength,
      attachToPlaywrightReport: config.attachToPlaywrightReport ?? DEFAULT_CONFIG.attachToPlaywrightReport,
      htmlReport: {
        enabled: config.htmlReport?.enabled ?? DEFAULT_CONFIG.htmlReport.enabled,
        outputDir: config.htmlReport?.outputDir ?? DEFAULT_CONFIG.htmlReport.outputDir,
        filename: config.htmlReport?.filename ?? DEFAULT_CONFIG.htmlReport.filename,
      },
      jsonReport: {
        enabled: config.jsonReport?.enabled ?? DEFAULT_CONFIG.jsonReport.enabled,
        outputDir: config.jsonReport?.outputDir ?? DEFAULT_CONFIG.jsonReport.outputDir,
        filename: config.jsonReport?.filename ?? DEFAULT_CONFIG.jsonReport.filename,
      },
      redact: {
        headers: config.redact?.headers ?? DEFAULT_CONFIG.redact.headers,
        bodyFields: config.redact?.bodyFields ?? DEFAULT_CONFIG.redact.bodyFields,
        replacement: config.redact?.replacement ?? DEFAULT_CONFIG.redact.replacement,
      },
      filter: {
        includePaths: config.filter?.includePaths ?? DEFAULT_CONFIG.filter.includePaths,
        excludePaths: config.filter?.excludePaths ?? DEFAULT_CONFIG.filter.excludePaths,
        methods: config.filter?.methods ?? DEFAULT_CONFIG.filter.methods,
      },
    };
  }

  /**
   * Sets current test information
   */
  setTestInfo(testInfo: { title: string; file: string; line?: number }): void {
    this._testInfo = testInfo;
  }

  /**
   * Gets configuration
   */
  get config(): Required<ApiSpyConfig> {
    return this._config;
  }

  /**
   * All captured requests
   */
  get requests(): CapturedRequest[] {
    return this._entries.map((e) => e.request);
  }

  /**
   * All captured responses (excludes entries without response)
   */
  get responses(): CapturedResponse[] {
    return this._entries
      .filter((e) => e.response !== undefined)
      .map((e) => e.response!);
  }

  /**
   * All captured entries
   */
  get entries(): CapturedEntry[] {
    return [...this._entries];
  }

  /**
   * Last captured request
   */
  get lastRequest(): CapturedRequest | undefined {
    return this._entries[this._entries.length - 1]?.request;
  }

  /**
   * Last captured response
   */
  get lastResponse(): CapturedResponse | undefined {
    return this._entries[this._entries.length - 1]?.response;
  }

  /**
   * Last captured entry
   */
  get lastEntry(): CapturedEntry | undefined {
    return this._entries[this._entries.length - 1];
  }

  /**
   * Check if logging is paused
   */
  get isPaused(): boolean {
    return this._paused;
  }

  /**
   * Add context to subsequent requests
   */
  addContext(context: string): void {
    this._context = context;
  }

  /**
   * Clear context
   */
  clearContext(): void {
    this._context = undefined;
  }

  /**
   * Pause logging
   */
  pause(): void {
    this._paused = true;
  }

  /**
   * Resume logging
   */
  resume(): void {
    this._paused = false;
  }

  /**
   * Clear all captured requests
   */
  clear(): void {
    this._entries = [];
  }

  /**
   * Hook called on each request
   */
  onRequest(callback: OnRequestCallback): void {
    this._onRequestCallbacks.push(callback);
  }

  /**
   * Hook called on each response
   */
  onResponse(callback: OnResponseCallback): void {
    this._onResponseCallbacks.push(callback);
  }

  /**
   * Hook called on error
   */
  onError(callback: OnErrorCallback): void {
    this._onErrorCallbacks.push(callback);
  }

  /**
   * Captures a request
   */
  async captureRequest(
    method: string,
    url: string,
    options?: {
      headers?: Record<string, string>;
      data?: unknown;
    }
  ): Promise<CapturedRequest | null> {
    if (this._paused) {
      return null;
    }

    const httpMethod = method.toUpperCase() as HttpMethod;
    const path = extractPath(url);

    // Check filters
    if (!matchesFilter(httpMethod, path, this._config.filter)) {
      return null;
    }

    const request: CapturedRequest = {
      id: generateId(),
      method: httpMethod,
      url,
      path,
      headers: options?.headers ?? {},
      body: options?.data ? parseBody(options.data) : undefined,
      timestamp: Date.now(),
      testInfo: this._testInfo,
      metadata: this._context ? { context: this._context } : undefined,
    };

    // Truncate body if too long
    if (request.body) {
      request.body = truncateBody(request.body, this._config.maxBodyLength);
    }

    // Call callbacks
    for (const callback of this._onRequestCallbacks) {
      await callback(request);
    }

    return request;
  }

  /**
   * Captures a response
   */
  async captureResponse(
    request: CapturedRequest,
    response: {
      status: number;
      statusText: string;
      headers: Record<string, string>;
      body?: unknown;
    },
    duration: number
  ): Promise<void> {
    const capturedResponse: CapturedResponse = {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      body: response.body ? parseBody(response.body) : undefined,
      duration,
    };

    // Truncate body if too long
    if (capturedResponse.body) {
      capturedResponse.body = truncateBody(capturedResponse.body, this._config.maxBodyLength);
    }

    const entry: CapturedEntry = {
      request,
      response: capturedResponse,
    };

    this._entries.push(entry);

    // Redact data before displaying
    const redactedRequest = redactRequest(request, this._config.redact);
    const redactedResponse = redactResponse(capturedResponse, this._config.redact);

    // Log to console
    if (this._config.console) {
      this._consoleFormatter.formatEntry({
        request: redactedRequest,
        response: redactedResponse,
      });
    }

    // Call callbacks
    for (const callback of this._onResponseCallbacks) {
      await callback(request, capturedResponse);
    }
  }

  /**
   * Captures an error
   */
  async captureError(request: CapturedRequest, error: Error): Promise<void> {
    const entry: CapturedEntry = {
      request,
      error: {
        message: error.message,
        stack: error.stack,
      },
    };

    this._entries.push(entry);

    // Redact data before displaying
    const redactedRequest = redactRequest(request, this._config.redact);

    // Log to console
    if (this._config.console) {
      this._consoleFormatter.formatEntry({
        request: redactedRequest,
        error: entry.error,
      });
    }

    // Call callbacks
    for (const callback of this._onErrorCallbacks) {
      await callback(request, error);
    }
  }

  /**
   * Gets all entries for report generation
   */
  getEntriesForReport(): CapturedEntry[] {
    return this._entries.map((entry) => ({
      request: redactRequest(entry.request, this._config.redact),
      response: entry.response
        ? redactResponse(entry.response, this._config.redact)
        : undefined,
      error: entry.error,
    }));
  }
}

/**
 * Global store for entries from all tests
 * Uses temporary file for communication between workers and reporter
 */
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

class GlobalApiSpyStore {
  private static instance: GlobalApiSpyStore;
  private _config: Required<ApiSpyConfig> = DEFAULT_CONFIG;
  private _tempFilePath: string;

  private constructor() {
    // Use fixed path so all workers and reporter use the same file
    this._tempFilePath = path.join(os.tmpdir(), 'playwright-api-spy-entries.json');
  }

  static getInstance(): GlobalApiSpyStore {
    if (!GlobalApiSpyStore.instance) {
      GlobalApiSpyStore.instance = new GlobalApiSpyStore();
    }
    return GlobalApiSpyStore.instance;
  }

  setConfig(config: Required<ApiSpyConfig>): void {
    this._config = config;
    // Save config to file
    const configPath = path.join(os.tmpdir(), 'playwright-api-spy-config.json');
    fs.writeFileSync(configPath, JSON.stringify(config), 'utf-8');
  }

  get config(): Required<ApiSpyConfig> {
    // Try to read config from file (for reporter)
    try {
      const configPath = path.join(os.tmpdir(), 'playwright-api-spy-config.json');
      if (fs.existsSync(configPath)) {
        const configStr = fs.readFileSync(configPath, 'utf-8');
        return JSON.parse(configStr) as Required<ApiSpyConfig>;
      }
    } catch {
      // Ignore errors
    }
    return this._config;
  }

  addEntries(entries: CapturedEntry[]): void {
    if (entries.length === 0) return;
    
    try {
      // Read existing entries
      let existingEntries: CapturedEntry[] = [];
      if (fs.existsSync(this._tempFilePath)) {
        const data = fs.readFileSync(this._tempFilePath, 'utf-8');
        existingEntries = JSON.parse(data) as CapturedEntry[];
      }
      
      // Add new entries
      existingEntries.push(...entries);
      
      // Save all
      fs.writeFileSync(this._tempFilePath, JSON.stringify(existingEntries), 'utf-8');
    } catch (error) {
      console.error('API Spy: Failed to save entries:', error);
    }
  }

  getAllEntries(): CapturedEntry[] {
    try {
      if (fs.existsSync(this._tempFilePath)) {
        const data = fs.readFileSync(this._tempFilePath, 'utf-8');
        return JSON.parse(data) as CapturedEntry[];
      }
    } catch (error) {
      console.error('API Spy: Failed to read entries:', error);
    }
    return [];
  }

  clear(): void {
    try {
      if (fs.existsSync(this._tempFilePath)) {
        fs.unlinkSync(this._tempFilePath);
      }
      const configPath = path.join(os.tmpdir(), 'playwright-api-spy-config.json');
      if (fs.existsSync(configPath)) {
        fs.unlinkSync(configPath);
      }
    } catch {
      // Ignore errors
    }
  }
  
  /**
   * Clears file before starting tests
   */
  reset(): void {
    try {
      if (fs.existsSync(this._tempFilePath)) {
        fs.unlinkSync(this._tempFilePath);
      }
    } catch {
      // Ignore errors
    }
  }
}

export const globalApiSpyStore = GlobalApiSpyStore.getInstance();
