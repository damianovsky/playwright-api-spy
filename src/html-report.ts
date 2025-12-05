import * as fs from 'fs';
import * as path from 'path';
import type { CapturedEntry, HtmlReportConfig } from './types.js';

/**
 * Escapes HTML special characters
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Formats JSON for HTML display
 */
function formatJsonHtml(obj: unknown): string {
  if (obj === undefined || obj === null) {
    return '<span class="json-null">null</span>';
  }
  return escapeHtml(JSON.stringify(obj, null, 2));
}

/**
 * Returns CSS class for HTTP status
 */
function getStatusClass(status: number): string {
  if (status >= 500) return 'status-error';
  if (status >= 400) return 'status-warning';
  if (status >= 300) return 'status-redirect';
  if (status >= 200) return 'status-success';
  return 'status-info';
}

/**
 * Returns CSS class for HTTP method
 */
function getMethodClass(method: string): string {
  return `method-${method.toLowerCase()}`;
}

/**
 * Generates cURL command from request
 */
function generateCurl(entry: CapturedEntry): string {
  const { request } = entry;
  let curl = `curl -X ${request.method} '${request.url}'`;
  
  for (const [key, value] of Object.entries(request.headers)) {
    curl += ` \\\n  -H '${key}: ${value}'`;
  }
  
  if (request.body) {
    const body = typeof request.body === 'string' 
      ? request.body 
      : JSON.stringify(request.body);
    curl += ` \\\n  -d '${body.replace(/'/g, "\\'")}'`;
  }
  
  return curl;
}

/**
 * HTML report generator - Playwright-style design
 */
export class HtmlReportGenerator {
  /**
   * Generates HTML for single entry
   */
  private generateEntryHtml(entry: CapturedEntry, index: number): string {
    const { request, response, error } = entry;
    const methodClass = getMethodClass(request.method);
    const statusClass = response ? getStatusClass(response.status) : 'status-error';
    const statusText = response 
      ? `${response.status} ${response.statusText}` 
      : 'Error';
    const duration = response ? `${response.duration}ms` : '-';
    const curl = escapeHtml(generateCurl(entry));

    return `
    <div class="entry" data-method="${request.method}" data-status="${response?.status || 0}" data-path="${escapeHtml(request.path)}">
      <div class="entry-header" onclick="toggleEntry(${index})">
        <div class="entry-header-left">
          <span class="method ${methodClass}">${request.method}</span>
          <span class="path">${escapeHtml(request.path)}</span>
        </div>
        <div class="entry-header-right">
          <span class="status ${statusClass}">${statusText}</span>
          <span class="duration">${duration}</span>
          <span class="toggle" id="toggle-${index}">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" stroke-width="1.5" fill="none"/>
            </svg>
          </span>
        </div>
      </div>
      <div class="entry-details" id="details-${index}">
        <div class="tabs">
          <button class="tab active" onclick="showTab(${index}, 'request')">Request</button>
          <button class="tab" onclick="showTab(${index}, 'response')">Response</button>
          <button class="tab" onclick="showTab(${index}, 'curl')">cURL</button>
        </div>
        
        <div class="tab-content" id="tab-${index}-request">
          <div class="detail-section">
            <h4>URL</h4>
            <pre class="url">${escapeHtml(request.url)}</pre>
          </div>
          <div class="detail-section">
            <h4>Headers</h4>
            <pre class="headers">${formatJsonHtml(request.headers)}</pre>
          </div>
          ${request.body ? `
          <div class="detail-section">
            <h4>Body</h4>
            <pre class="body">${formatJsonHtml(request.body)}</pre>
          </div>
          ` : ''}
          ${request.testInfo ? `
          <div class="detail-section test-info">
            <h4>Test Info</h4>
            <p><strong>File:</strong> ${escapeHtml(request.testInfo.file)}</p>
            <p><strong>Test:</strong> ${escapeHtml(request.testInfo.title)}</p>
            ${request.testInfo.line ? `<p><strong>Line:</strong> ${request.testInfo.line}</p>` : ''}
          </div>
          ` : ''}
        </div>
        
        <div class="tab-content" id="tab-${index}-response" style="display: none;">
          ${response ? `
          <div class="detail-section">
            <h4>Status</h4>
            <p class="status-badge ${statusClass}">${response.status} ${escapeHtml(response.statusText)}</p>
          </div>
          <div class="detail-section">
            <h4>Duration</h4>
            <p>${response.duration}ms</p>
          </div>
          <div class="detail-section">
            <h4>Headers</h4>
            <pre class="headers">${formatJsonHtml(response.headers)}</pre>
          </div>
          ${response.body ? `
          <div class="detail-section">
            <h4>Body</h4>
            <pre class="body">${formatJsonHtml(response.body)}</pre>
          </div>
          ` : ''}
          ` : ''}
          ${error ? `
          <div class="detail-section error-section">
            <h4>Error</h4>
            <pre class="error-message">${escapeHtml(error.message)}</pre>
            ${error.stack ? `<pre class="error-stack">${escapeHtml(error.stack)}</pre>` : ''}
          </div>
          ` : ''}
        </div>
        
        <div class="tab-content" id="tab-${index}-curl" style="display: none;">
          <div class="detail-section">
            <pre class="curl">${curl}</pre>
            <button class="copy-btn" onclick="copyToClipboard(\`${curl.replace(/`/g, '\\`').replace(/\\/g, '\\\\')}\`)">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M4 4h2v2H4zm0 3h2v2H4zm0 3h2v2H4zm3-6h5v2H7zm0 3h5v2H7zm0 3h5v2H7z"/>
              </svg>
              Copy
            </button>
          </div>
        </div>
      </div>
    </div>`;
  }

  /**
   * Generates timeline visualization
   */
  private generateTimeline(entries: CapturedEntry[]): string {
    if (entries.length === 0) return '';
    
    const timestamps = entries.map(e => e.request.timestamp);
    const minTime = Math.min(...timestamps);
    const maxTime = Math.max(...timestamps);
    const totalDuration = maxTime - minTime || 1;
    
    const points = entries.map((entry, index) => {
      const x = ((entry.request.timestamp - minTime) / totalDuration) * 100;
      const statusClass = entry.response 
        ? getStatusClass(entry.response.status) 
        : 'status-error';
      return `<div class="timeline-point ${statusClass}" style="left: ${x}%" title="${entry.request.method} ${entry.request.path}" onclick="scrollToEntry(${index})"></div>`;
    }).join('');

    return `
    <div class="timeline-container">
      <h3>Timeline</h3>
      <div class="timeline">
        ${points}
      </div>
      <div class="timeline-labels">
        <span>0ms</span>
        <span>${Math.round(totalDuration)}ms</span>
      </div>
    </div>`;
  }

  /**
   * Generates complete HTML report - Playwright-style design
   */
  generate(entries: CapturedEntry[]): string {
    const durations = entries
      .filter((e) => e.response)
      .map((e) => e.response!.duration);

    const failedCount = entries.filter(
      (e) => e.error || (e.response && e.response.status >= 400)
    ).length;

    const avgDuration = durations.length > 0
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : 0;

    const entriesHtml = entries.map((entry, index) => 
      this.generateEntryHtml(entry, index)
    ).join('');

    const timelineHtml = this.generateTimeline(entries);

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>API Spy Report | Playwright</title>
  <style>
    :root {
      --color-bg: #1a1a1a;
      --color-bg-secondary: #242424;
      --color-bg-tertiary: #2a2a2a;
      --color-border: #333;
      --color-text: #e8e8e8;
      --color-text-secondary: #999;
      --color-text-muted: #666;
      --color-success: #45ba4b;
      --color-warning: #e6a23c;
      --color-error: #f14c4c;
      --color-info: #409eff;
      --color-method-get: #61affe;
      --color-method-post: #49cc90;
      --color-method-put: #fca130;
      --color-method-patch: #50e3c2;
      --color-method-delete: #f93e3e;
      --font-mono: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Mono', 'Droid Sans Mono', monospace;
      --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
      --shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      --radius: 6px;
    }
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    body {
      font-family: var(--font-sans);
      background: var(--color-bg);
      color: var(--color-text);
      line-height: 1.5;
      font-size: 14px;
    }
    
    .container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 24px;
    }
    
    /* Header */
    header {
      margin-bottom: 24px;
    }
    
    .header-top {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 24px;
    }
    
    .logo {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    .logo svg {
      width: 32px;
      height: 32px;
    }
    
    h1 {
      font-size: 20px;
      font-weight: 600;
    }
    
    .header-meta {
      color: var(--color-text-secondary);
      font-size: 13px;
    }
    
    /* Stats cards */
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    
    .stat-card {
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      padding: 20px;
    }
    
    .stat-label {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--color-text-secondary);
      margin-bottom: 8px;
    }
    
    .stat-value {
      font-size: 28px;
      font-weight: 600;
    }
    
    .stat-value.success { color: var(--color-success); }
    .stat-value.error { color: var(--color-error); }
    .stat-value.info { color: var(--color-info); }
    
    /* Filters */
    .filters {
      display: flex;
      gap: 12px;
      margin-bottom: 24px;
      flex-wrap: wrap;
    }
    
    .filter-group {
      position: relative;
    }
    
    .filters select,
    .filters input {
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border);
      color: var(--color-text);
      padding: 10px 14px;
      border-radius: var(--radius);
      font-size: 13px;
      font-family: var(--font-sans);
      outline: none;
      transition: border-color 0.2s;
    }
    
    .filters select:hover,
    .filters input:hover {
      border-color: #444;
    }
    
    .filters select:focus,
    .filters input:focus {
      border-color: var(--color-info);
    }
    
    .filters input {
      min-width: 280px;
    }
    
    .filters input::placeholder {
      color: var(--color-text-muted);
    }
    
    /* Timeline */
    .timeline-container {
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      padding: 20px;
      margin-bottom: 24px;
    }
    
    .timeline-container h3 {
      font-size: 14px;
      font-weight: 500;
      margin-bottom: 16px;
      color: var(--color-text-secondary);
    }
    
    .timeline {
      position: relative;
      height: 32px;
      background: var(--color-bg-tertiary);
      border-radius: 4px;
      margin-bottom: 8px;
    }
    
    .timeline-point {
      position: absolute;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      cursor: pointer;
      transition: transform 0.15s ease;
    }
    
    .timeline-point:hover {
      transform: translate(-50%, -50%) scale(1.6);
      z-index: 10;
    }
    
    .timeline-labels {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: var(--color-text-muted);
    }
    
    /* Entries */
    .entries {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    .entry {
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      overflow: hidden;
    }
    
    .entry-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      cursor: pointer;
      transition: background 0.15s;
    }
    
    .entry-header:hover {
      background: var(--color-bg-tertiary);
    }
    
    .entry-header-left {
      display: flex;
      align-items: center;
      gap: 12px;
      flex: 1;
      min-width: 0;
    }
    
    .entry-header-right {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    
    .method {
      font-family: var(--font-mono);
      font-size: 11px;
      font-weight: 600;
      padding: 4px 8px;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .method-get { background: rgba(97, 175, 254, 0.15); color: var(--color-method-get); }
    .method-post { background: rgba(73, 204, 144, 0.15); color: var(--color-method-post); }
    .method-put { background: rgba(252, 161, 48, 0.15); color: var(--color-method-put); }
    .method-patch { background: rgba(80, 227, 194, 0.15); color: var(--color-method-patch); }
    .method-delete { background: rgba(249, 62, 62, 0.15); color: var(--color-method-delete); }
    .method-head, .method-options { background: rgba(153, 153, 153, 0.15); color: var(--color-text-secondary); }
    
    .path {
      font-family: var(--font-mono);
      font-size: 13px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    
    .status {
      font-family: var(--font-mono);
      font-size: 12px;
      font-weight: 500;
    }
    
    .status-success { color: var(--color-success); }
    .status-redirect { color: var(--color-info); }
    .status-warning { color: var(--color-warning); }
    .status-error { color: var(--color-error); }
    
    .duration {
      font-family: var(--font-mono);
      font-size: 12px;
      color: var(--color-text-secondary);
      min-width: 60px;
      text-align: right;
    }
    
    .toggle {
      color: var(--color-text-muted);
      transition: transform 0.2s;
      display: flex;
      align-items: center;
    }
    
    .toggle.open {
      transform: rotate(180deg);
    }
    
    /* Entry details */
    .entry-details {
      display: none;
      border-top: 1px solid var(--color-border);
      background: var(--color-bg);
    }
    
    .entry-details.open {
      display: block;
    }
    
    .tabs {
      display: flex;
      gap: 4px;
      padding: 12px 16px;
      background: var(--color-bg-secondary);
      border-bottom: 1px solid var(--color-border);
    }
    
    .tab {
      background: transparent;
      border: none;
      color: var(--color-text-secondary);
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
      font-family: var(--font-sans);
      transition: all 0.15s;
    }
    
    .tab:hover {
      background: var(--color-bg-tertiary);
      color: var(--color-text);
    }
    
    .tab.active {
      background: var(--color-info);
      color: white;
    }
    
    .tab-content {
      padding: 20px;
    }
    
    .detail-section {
      margin-bottom: 20px;
    }
    
    .detail-section:last-child {
      margin-bottom: 0;
    }
    
    .detail-section h4 {
      font-size: 11px;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--color-text-secondary);
      margin-bottom: 8px;
    }
    
    pre {
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border);
      padding: 16px;
      border-radius: var(--radius);
      overflow-x: auto;
      font-family: var(--font-mono);
      font-size: 12px;
      line-height: 1.6;
    }
    
    .status-badge {
      display: inline-block;
      font-family: var(--font-mono);
      font-size: 13px;
      font-weight: 500;
      padding: 6px 12px;
      border-radius: 4px;
    }
    
    .status-badge.status-success { background: rgba(69, 186, 75, 0.15); }
    .status-badge.status-warning { background: rgba(230, 162, 60, 0.15); }
    .status-badge.status-error { background: rgba(241, 76, 76, 0.15); }
    .status-badge.status-redirect { background: rgba(64, 158, 255, 0.15); }
    
    .error-section pre {
      border-color: var(--color-error);
    }
    
    .error-message {
      color: var(--color-error);
    }
    
    .error-stack {
      color: var(--color-text-muted);
      font-size: 11px;
      margin-top: 8px;
    }
    
    .copy-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      margin-top: 12px;
      background: var(--color-info);
      border: none;
      color: white;
      padding: 8px 16px;
      border-radius: var(--radius);
      cursor: pointer;
      font-size: 13px;
      font-family: var(--font-sans);
      transition: opacity 0.15s;
    }
    
    .copy-btn:hover {
      opacity: 0.9;
    }
    
    .copy-btn svg {
      opacity: 0.9;
    }
    
    .test-info p {
      margin-bottom: 4px;
      font-size: 13px;
    }
    
    .test-info strong {
      color: var(--color-text-secondary);
    }
    
    .no-results {
      text-align: center;
      padding: 60px 20px;
      color: var(--color-text-secondary);
    }
    
    .no-results svg {
      width: 48px;
      height: 48px;
      margin-bottom: 16px;
      opacity: 0.5;
    }
    
    /* Responsive */
    @media (max-width: 768px) {
      .container {
        padding: 16px;
      }
      
      .entry-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
      }
      
      .entry-header-right {
        width: 100%;
        justify-content: flex-start;
      }
      
      .filters {
        flex-direction: column;
      }
      
      .filters input {
        min-width: auto;
        width: 100%;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="header-top">
        <div class="logo">
          <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 4L28 10V22L16 28L4 22V10L16 4Z" fill="#45ba4b" fill-opacity="0.2"/>
            <path d="M16 4L28 10V22L16 28L4 22V10L16 4Z" stroke="#45ba4b" stroke-width="2"/>
            <circle cx="16" cy="16" r="4" fill="#45ba4b"/>
          </svg>
          <h1>API Spy Report</h1>
        </div>
      </div>
      <div class="header-meta">
        Generated: ${new Date().toLocaleString()}
      </div>
    </header>
    
    <div class="stats">
      <div class="stat-card">
        <div class="stat-label">Total Requests</div>
        <div class="stat-value">${entries.length}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Successful</div>
        <div class="stat-value success">${entries.length - failedCount}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Failed</div>
        <div class="stat-value error">${failedCount}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Avg Duration</div>
        <div class="stat-value info">${avgDuration}ms</div>
      </div>
    </div>
    
    <div class="filters">
      <div class="filter-group">
        <select id="methodFilter" onchange="filterEntries()">
          <option value="">All Methods</option>
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="PATCH">PATCH</option>
          <option value="DELETE">DELETE</option>
        </select>
      </div>
      <div class="filter-group">
        <select id="statusFilter" onchange="filterEntries()">
          <option value="">All Status</option>
          <option value="2xx">2xx Success</option>
          <option value="3xx">3xx Redirect</option>
          <option value="4xx">4xx Client Error</option>
          <option value="5xx">5xx Server Error</option>
        </select>
      </div>
      <div class="filter-group">
        <input type="text" id="searchFilter" placeholder="Search in path..." oninput="filterEntries()">
      </div>
    </div>
    
    ${timelineHtml}
    
    <div class="entries" id="entriesList">
      ${entriesHtml}
    </div>
    
    <div class="no-results" id="noResults" style="display: none;">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8"/>
        <path d="M21 21l-4.35-4.35"/>
      </svg>
      <p>No requests match the current filters.</p>
    </div>
  </div>
  
  <script>
    function toggleEntry(index) {
      const details = document.getElementById('details-' + index);
      const toggle = document.getElementById('toggle-' + index);
      
      if (details.classList.contains('open')) {
        details.classList.remove('open');
        toggle.classList.remove('open');
      } else {
        details.classList.add('open');
        toggle.classList.add('open');
      }
    }
    
    function showTab(index, tabName) {
      const tabs = ['request', 'response', 'curl'];
      tabs.forEach(tab => {
        const content = document.getElementById('tab-' + index + '-' + tab);
        if (content) {
          content.style.display = tab === tabName ? 'block' : 'none';
        }
      });
      
      const tabContainer = document.querySelector('#details-' + index + ' .tabs');
      if (tabContainer) {
        tabContainer.querySelectorAll('.tab').forEach(btn => {
          btn.classList.remove('active');
          if (btn.textContent.toLowerCase() === tabName) {
            btn.classList.add('active');
          }
        });
      }
    }
    
    function copyToClipboard(text) {
      navigator.clipboard.writeText(text).then(() => {
        const btn = event.target.closest('.copy-btn');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z"/></svg> Copied!';
        setTimeout(() => { btn.innerHTML = originalText; }, 2000);
      });
    }
    
    function scrollToEntry(index) {
      const entries = document.querySelectorAll('.entry');
      if (entries[index]) {
        entries[index].scrollIntoView({ behavior: 'smooth', block: 'center' });
        const details = document.getElementById('details-' + index);
        const toggle = document.getElementById('toggle-' + index);
        details.classList.add('open');
        toggle.classList.add('open');
      }
    }
    
    function filterEntries() {
      const method = document.getElementById('methodFilter').value;
      const status = document.getElementById('statusFilter').value;
      const search = document.getElementById('searchFilter').value.toLowerCase();
      
      const entries = document.querySelectorAll('.entry');
      let visibleCount = 0;
      
      entries.forEach(entry => {
        const entryMethod = entry.dataset.method;
        const entryStatus = parseInt(entry.dataset.status);
        const entryPath = entry.dataset.path.toLowerCase();
        
        let show = true;
        
        if (method && entryMethod !== method) {
          show = false;
        }
        
        if (status) {
          const statusPrefix = status[0];
          const entryStatusPrefix = Math.floor(entryStatus / 100).toString();
          if (statusPrefix !== entryStatusPrefix) {
            show = false;
          }
        }
        
        if (search && !entryPath.includes(search)) {
          show = false;
        }
        
        entry.style.display = show ? 'block' : 'none';
        if (show) visibleCount++;
      });
      
      document.getElementById('noResults').style.display = 
        visibleCount === 0 ? 'block' : 'none';
    }
  </script>
</body>
</html>`;
  }

  /**
   * Saves report to file
   */
  async save(entries: CapturedEntry[], config: HtmlReportConfig): Promise<string> {
    if (!config.enabled) {
      return '';
    }

    const html = this.generate(entries);
    const outputDir = config.outputDir || './api-spy-report';
    const filename = config.filename || 'api-spy.html';
    const outputPath = path.join(outputDir, filename);

    // Create directory if doesn't exist
    await fs.promises.mkdir(outputDir, { recursive: true });

    // Save report
    await fs.promises.writeFile(outputPath, html, 'utf-8');

    return outputPath;
  }
}
