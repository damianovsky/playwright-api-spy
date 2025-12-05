import type { Reporter, FullConfig, Suite, TestCase, TestResult, FullResult } from '@playwright/test/reporter';
import { globalApiSpyStore } from './api-spy.js';
import { JsonReportGenerator } from './json-report.js';
import { HtmlReportGenerator } from './html-report.js';

/**
 * Playwright Reporter for generating API Spy reports
 */
class ApiSpyReporterImpl implements Reporter {
  private jsonGenerator = new JsonReportGenerator();
  private htmlGenerator = new HtmlReportGenerator();

  onBegin(config: FullConfig, suite: Suite): void {
    // Initialization - nothing needed here
  }

  onTestBegin(test: TestCase, result: TestResult): void {
    // Can add pre-test logic here
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    // Can add post-test logic here
  }

  async onEnd(result: FullResult): Promise<void> {
    const config = globalApiSpyStore.config;
    const entries = globalApiSpyStore.getAllEntries();

    if (entries.length === 0) {
      return;
    }

    // Generate JSON report (silently)
    if (config.jsonReport.enabled) {
      try {
        await this.jsonGenerator.save(entries, config.jsonReport);
      } catch (error) {
        // Silent fail
      }
    }

    // Generate HTML report (silently)
    if (config.htmlReport.enabled) {
      try {
        await this.htmlGenerator.save(entries, config.htmlReport);
      } catch (error) {
        // Silent fail
      }
    }

    // Clear store
    globalApiSpyStore.clear();
  }
}

export default ApiSpyReporterImpl;
