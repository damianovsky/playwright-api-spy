import * as fs from 'fs';
import * as path from 'path';
import type { CapturedEntry, JsonReportConfig } from './types.js';

/**
 * JSON report interface
 */
export interface JsonReport {
  /** Report format version */
  version: string;
  /** Report generation timestamp */
  generatedAt: string;
  /** Summary statistics */
  summary: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    avgDuration: number;
    minDuration: number;
    maxDuration: number;
  };
  /** All captured entries */
  entries: CapturedEntry[];
}

/**
 * JSON report generator
 */
export class JsonReportGenerator {
  /**
   * Generates JSON report
   */
  generate(entries: CapturedEntry[]): JsonReport {
    const durations = entries
      .filter((e) => e.response)
      .map((e) => e.response!.duration);

    const failedCount = entries.filter(
      (e) => e.error || (e.response && e.response.status >= 400)
    ).length;

    return {
      version: '1.0.0',
      generatedAt: new Date().toISOString(),
      summary: {
        totalRequests: entries.length,
        successfulRequests: entries.length - failedCount,
        failedRequests: failedCount,
        avgDuration: durations.length > 0
          ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
          : 0,
        minDuration: durations.length > 0 ? Math.min(...durations) : 0,
        maxDuration: durations.length > 0 ? Math.max(...durations) : 0,
      },
      entries,
    };
  }

  /**
   * Saves report to file
   */
  async save(entries: CapturedEntry[], config: JsonReportConfig): Promise<string> {
    if (!config.enabled) {
      return '';
    }

    const report = this.generate(entries);
    const outputDir = config.outputDir || './api-spy-report';
    const filename = config.filename || 'api-spy.json';
    const outputPath = path.join(outputDir, filename);

    // Create directory if doesn't exist
    await fs.promises.mkdir(outputDir, { recursive: true });

    // Save report
    await fs.promises.writeFile(
      outputPath,
      JSON.stringify(report, null, 2),
      'utf-8'
    );

    return outputPath;
  }
}
