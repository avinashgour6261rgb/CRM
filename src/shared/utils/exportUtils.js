/**
 * @file exportUtils.js
 * @description Standard, RFC 4180-compliant CSV Export Utility using Blob & UTF-8 BOM.
 * 
 * Why this is needed:
 * 1. Prevents URI fragment truncation: Using `data:text/csv;...` with `encodeURI()` truncates
 *    the entire file whenever any cell or header contains `#` (e.g., `#TSK-12`, `#ADM-001`,
 *    `Ticket #`, or hex codes), because `#` starts a URL anchor fragment.
 * 2. Overcomes URL size limits: Data URIs fail when content exceeds ~2MB in modern browsers.
 * 3. Supports UTF-8 BOM (\uFEFF) so Excel correctly displays Indian currency (₹), symbols,
 *    accents, and special characters without encoding corruption.
 */

/**
 * Cleanly formats and quotes a single CSV field value.
 */
function sanitizeCell(cell) {
  if (cell === null || cell === undefined) return '""';
  const str = String(cell);
  return `"${str.replace(/"/g, '""')}"`;
}

/**
 * Downloads raw CSV text content using a Blob and temporary object URL.
 * @param {string} filename - Filename with or without .csv extension
 * @param {string} rawCsvContent - Full CSV string
 */
export function downloadCSVBlob(filename, rawCsvContent) {
  if (!rawCsvContent) return;

  // Add UTF-8 BOM (\uFEFF) so Excel opens UTF-8 text properly
  const bomPrefix = rawCsvContent.startsWith('\uFEFF') ? '' : '\uFEFF';
  const blob = new Blob([bomPrefix + rawCsvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.setAttribute('href', url);
  const cleanName = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  link.setAttribute('download', cleanName);
  document.body.appendChild(link);
  link.click();

  // Cleanup after browser processes the click
  setTimeout(() => {
    try {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (_) {}
  }, 150);
}

/**
 * Formats headers and row arrays into a clean CSV and triggers the download.
 * @param {string} filename - Download filename
 * @param {Array<string>|string} headers - Column headers array or single header line
 * @param {Array<Array<any>>|Array<string>} rows - 2D matrix of row cells or array of pre-joined rows
 */
export function exportToCSV(filename, headers, rows = []) {
  let headerLine = '';
  if (Array.isArray(headers)) {
    if (headers.length > 0 && Array.isArray(headers[0])) {
      headerLine = headers.map(hRow => hRow.map(sanitizeCell).join(',')).join('\r\n');
    } else {
      headerLine = headers.map(sanitizeCell).join(',');
    }
  } else if (typeof headers === 'string') {
    headerLine = headers;
  }

  const dataLines = rows.map(row => {
    if (Array.isArray(row)) {
      return row.map(sanitizeCell).join(',');
    }
    return String(row);
  });

  const fullContent = headerLine ? [headerLine, ...dataLines].join('\r\n') : dataLines.join('\r\n');
  downloadCSVBlob(filename, fullContent);
}
