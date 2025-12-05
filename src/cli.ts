#!/usr/bin/env node
/**
 * CLI for playwright-api-spy
 * 
 * Usage:
 *   npx playwright-api-spy show-report [path]
 */
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const DEFAULT_REPORT_PATHS = [
  './playwright-report/api-spy.html',
  './api-spy-report/api-spy.html',
  './test-results/api-spy.html',
];

function findReportFile(customPath?: string): string | null {
  if (customPath) {
    const resolved = path.resolve(customPath);
    if (fs.existsSync(resolved)) {
      return resolved;
    }
    // Try adding filename if directory provided
    const withFilename = path.join(resolved, 'api-spy.html');
    if (fs.existsSync(withFilename)) {
      return withFilename;
    }
    return null;
  }

  for (const reportPath of DEFAULT_REPORT_PATHS) {
    const resolved = path.resolve(reportPath);
    if (fs.existsSync(resolved)) {
      return resolved;
    }
  }
  return null;
}

function openBrowser(filePath: string): void {
  const platform = os.platform();
  let command: string;
  let args: string[];

  switch (platform) {
    case 'darwin':
      command = 'open';
      args = [filePath];
      break;
    case 'win32':
      command = 'cmd';
      args = ['/c', 'start', '', filePath];
      break;
    default:
      command = 'xdg-open';
      args = [filePath];
  }

  const child = spawn(command, args, {
    detached: true,
    stdio: 'ignore',
  });
  child.unref();
}

function showHelp(): void {
  console.log(`
📊 playwright-api-spy CLI

Usage:
  npx playwright-api-spy <command> [options]

Commands:
  show-report [path]    Open API Spy HTML report in browser
                        Default paths checked:
                        - ./playwright-report/api-spy.html
                        - ./api-spy-report/api-spy.html
                        - ./test-results/api-spy.html

Examples:
  npx playwright-api-spy show-report
  npx playwright-api-spy show-report ./custom-folder/api-spy.html
  npx playwright-api-spy show-report ./playwright-report
`);
}

function main(): void {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'show-report':
    case 'report': {
      const customPath = args[1];
      const reportFile = findReportFile(customPath);

      if (!reportFile) {
        console.error('❌ API Spy report not found.');
        console.error('');
        console.error('Searched in:');
        if (customPath) {
          console.error(`  - ${path.resolve(customPath)}`);
        } else {
          DEFAULT_REPORT_PATHS.forEach((p) => {
            console.error(`  - ${path.resolve(p)}`);
          });
        }
        console.error('');
        console.error('Make sure to run tests first: npx playwright test');
        process.exit(1);
      }

      console.log(`📊 Opening API Spy report: ${reportFile}`);
      openBrowser(reportFile);
      break;
    }

    case 'help':
    case '--help':
    case '-h':
      showHelp();
      break;

    default:
      if (command) {
        console.error(`Unknown command: ${command}`);
        console.error('');
      }
      showHelp();
      process.exit(command ? 1 : 0);
  }
}

main();
