import chalk from 'chalk';
import type { ApiSpyConfig, CapturedEntry, CapturedRequest, CapturedResponse, Verbosity } from './types.js';

/**
 * Box drawing characters
 */
const BOX = {
  topLeft: '╭',
  topRight: '╮',
  bottomLeft: '╰',
  bottomRight: '╯',
  horizontal: '─',
  vertical: '│',
  teeRight: '├',
  teeLeft: '┤',
};

/**
 * Status emojis
 */
const EMOJI = {
  GET: '🔵',
  POST: '🟢',
  PUT: '🟡',
  PATCH: '🟠',
  DELETE: '🔴',
  HEAD: '⚪',
  OPTIONS: '⚪',
  request: '📤',
  response: '📥',
  error: '❌',
  location: '📍',
  time: '⏱️',
};

/**
 * Gets color function for HTTP status
 */
function getStatusColor(status: number, colors: boolean): (text: string) => string {
  if (!colors) return (text: string) => text;
  
  if (status >= 500) return chalk.red;
  if (status >= 400) return chalk.yellow;
  if (status >= 300) return chalk.cyan;
  if (status >= 200) return chalk.green;
  return chalk.white;
}

/**
 * Gets color function for HTTP method
 */
function getMethodColor(method: string, colors: boolean): (text: string) => string {
  if (!colors) return (text: string) => text;
  
  switch (method) {
    case 'GET': return chalk.blue;
    case 'POST': return chalk.green;
    case 'PUT': return chalk.yellow;
    case 'PATCH': return chalk.hex('#FFA500');
    case 'DELETE': return chalk.red;
    default: return chalk.white;
  }
}

/**
 * Formats JSON with indentation
 */
function formatJson(obj: unknown, indent = 2, prefix = ''): string[] {
  const json = JSON.stringify(obj, null, indent);
  return json.split('\n').map((line) => prefix + line);
}

/**
 * Truncates text to maximum length
 */
function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Console output formatter class
 */
export class ConsoleFormatter {
  private config: Required<ApiSpyConfig>;
  private boxWidth = 70;

  constructor(config: Required<ApiSpyConfig>) {
    this.config = config;
  }

  /**
   * Draws horizontal line
   */
  private horizontalLine(left: string, right: string): string {
    return left + BOX.horizontal.repeat(this.boxWidth - 2) + right;
  }

  /**
   * Draws line with text
   */
  private textLine(text: string, padChar = ' '): string {
    const contentWidth = this.boxWidth - 4;
    const paddedText = text.padEnd(contentWidth, padChar);
    return BOX.vertical + ' ' + truncate(paddedText, contentWidth) + ' ' + BOX.vertical;
  }

  /**
   * Formats headers
   */
  private formatHeaders(
    headers: Record<string, string>,
    prefix: string,
    colors: boolean
  ): string[] {
    const lines: string[] = [];
    const dim = colors ? chalk.dim : (text: string) => text;
    
    for (const [key, value] of Object.entries(headers)) {
      const line = `${prefix}${dim(key + ':')} ${value}`;
      lines.push(this.textLine(line));
    }
    return lines;
  }

  /**
   * Formats body
   */
  private formatBody(body: unknown, prefix: string): string[] {
    const lines: string[] = [];
    if (body === undefined || body === null) {
      return lines;
    }

    if (typeof body === 'string') {
      const bodyLines = body.split('\n');
      for (const line of bodyLines) {
        lines.push(this.textLine(prefix + line));
      }
    } else {
      const jsonLines = formatJson(body, 2, prefix);
      for (const line of jsonLines) {
        lines.push(this.textLine(line));
      }
    }
    return lines;
  }

  /**
   * Formats single entry (request + response)
   */
  formatEntry(entry: CapturedEntry): void {
    const { request, response, error } = entry;
    const { colors, verbosity } = this.config;
    const lines: string[] = [];

    const methodColor = getMethodColor(request.method, colors);
    const emoji = EMOJI[request.method as keyof typeof EMOJI] || '⚪';

    // Header - method and path
    lines.push(this.horizontalLine(BOX.topLeft, BOX.topRight));
    const headerText = `${emoji} ${methodColor(request.method)} ${request.path}`;
    lines.push(this.textLine(headerText));

    // Request section
    if (verbosity !== 'minimal') {
      lines.push(this.horizontalLine(BOX.teeRight, BOX.teeLeft));
      lines.push(this.textLine(`${EMOJI.request} Request`));

      // Headers (verbose only)
      if (verbosity === 'verbose' && Object.keys(request.headers).length > 0) {
        lines.push(this.textLine('   Headers:'));
        lines.push(...this.formatHeaders(request.headers, '     ', colors));
      }

      // Body
      if (request.body !== undefined) {
        lines.push(this.textLine('   Body:'));
        lines.push(...this.formatBody(request.body, '     '));
      }
    }

    // Response section
    if (response) {
      lines.push(this.horizontalLine(BOX.teeRight, BOX.teeLeft));
      const statusColor = getStatusColor(response.status, colors);
      const statusText = `${EMOJI.response} Response: ${statusColor(`${response.status} ${response.statusText}`)}`;
      lines.push(this.textLine(statusText));
      lines.push(this.textLine(`   ${EMOJI.time} Time: ${response.duration}ms`));

      if (verbosity !== 'minimal') {
        // Headers (verbose only)
        if (verbosity === 'verbose' && Object.keys(response.headers).length > 0) {
          lines.push(this.textLine('   Headers:'));
          lines.push(...this.formatHeaders(response.headers, '     ', colors));
        }

        // Body
        if (response.body !== undefined) {
          lines.push(this.textLine('   Body:'));
          lines.push(...this.formatBody(response.body, '     '));
        }
      }
    }

    // Error section
    if (error) {
      lines.push(this.horizontalLine(BOX.teeRight, BOX.teeLeft));
      const errorColor = colors ? chalk.red : (text: string) => text;
      lines.push(this.textLine(`${EMOJI.error} Error: ${errorColor(error.message)}`));
      
      if (verbosity === 'verbose' && error.stack) {
        const stackLines = error.stack.split('\n').slice(0, 3);
        for (const line of stackLines) {
          lines.push(this.textLine(`   ${line.trim()}`));
        }
      }
    }

    // Test info
    if (request.testInfo) {
      lines.push(this.horizontalLine(BOX.teeRight, BOX.teeLeft));
      const location = `${EMOJI.location} ${request.testInfo.file}${request.testInfo.line ? `:${request.testInfo.line}` : ''} › ${request.testInfo.title}`;
      lines.push(this.textLine(location));
    }

    // Context
    if (request.metadata?.context) {
      lines.push(this.textLine(`   Context: ${request.metadata.context}`));
    }

    // Close frame
    lines.push(this.horizontalLine(BOX.bottomLeft, BOX.bottomRight));

    // Print all
    console.log(lines.join('\n'));
    console.log(); // Empty line between entries
  }

  /**
   * Formats summary
   */
  formatSummary(entries: CapturedEntry[]): void {
    const { colors } = this.config;
    const total = entries.length;
    const failed = entries.filter(
      (e) => e.error || (e.response && e.response.status >= 400)
    ).length;
    const avgTime =
      entries.length > 0
        ? Math.round(
            entries
              .filter((e) => e.response)
              .reduce((sum, e) => sum + (e.response?.duration || 0), 0) /
              entries.filter((e) => e.response).length
          )
        : 0;

    const bold = colors ? chalk.bold : (text: string) => text;
    const green = colors ? chalk.green : (text: string) => text;
    const red = colors ? chalk.red : (text: string) => text;

    console.log(
      bold('\n📊 API Spy Summary:'),
      `Total: ${total}`,
      green(`Success: ${total - failed}`),
      red(`Failed: ${failed}`),
      `Avg Time: ${avgTime}ms\n`
    );
  }
}
