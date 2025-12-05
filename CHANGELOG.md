# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-12-05

### Added

- Initial release of playwright-api-spy
- Automatic API request/response capturing via Playwright's `APIRequestContext`
- Playwright-style HTML report with filtering, search, and timeline visualization
- JSON report generation for CI/CD integration
- Sensitive data redaction (passwords, tokens, API keys)
- Automatic attachment of API data to Playwright test reports
- Request filtering by path patterns and HTTP methods
- Console output with customizable verbosity levels
- Hook system for custom request/response handling (`onRequest`, `onResponse`, `onError`)
- Pause/resume functionality for selective logging
- Context annotation for request grouping
- cURL command generation in HTML report
- TypeScript support with full type definitions

### Configuration Options

- `console` - Enable/disable console logging
- `verbosity` - Output detail level (minimal/normal/verbose)
- `htmlReport` - HTML report settings
- `jsonReport` - JSON report settings
- `redact` - Sensitive data redaction settings
- `filter` - Request filtering settings
- `attachToPlaywrightReport` - Integration with Playwright reports

### API

- `testWithApiSpy` - Extended test fixture with API capturing
- `withApiSpy()` - Playwright config wrapper
- `apiSpy` fixture with full API for test assertions
