import fs from 'node:fs';
import path from 'node:path';

/**
 * @param {string} dir Directory to scan.
 * @returns {string[]} Text fixture files, sorted by path.
 */
export function findSourceFiles(dir) {
  if (!fs.existsSync(dir)) {
    return [];
  }

  const files = [];

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const entryPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...findSourceFiles(entryPath));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.txt') && !entry.name.endsWith('.expect.txt')) {
      files.push(entryPath);
    }
  }

  return files.sort();
}

/**
 * Converts a highlight.js CSS selector to an ANSI theme scope.
 *
 * Supports root, token, compound, and nested selectors.
 * Unsupported CSS selectors return null.
 *
 * @param {string} selector CSS selector from a highlight.js theme.
 * @returns {string|null} Theme scope, or null when selector is not supported.
 */
export function selectorToScope(selector) {
  if (!selector.includes('.hljs')) {
    return null;
  }

  if (/[>+~:]/.test(selector)) {
    return null;
  }

  const parts = selector.trim().split(/\s+/);
  const scopes = [];

  for (const part of parts) {
    if (!part.includes('.hljs') && !isRootSelectorPart(part)) {
      return null;
    }

    const scope = selectorPartToScope(part);

    if (scope && scope !== 'default') {
      scopes.push(scope);
    }
  }

  if (scopes.length === 0) {
    return selector.includes('.hljs') ? 'default' : null;
  }

  return scopes.join(' ');
}

/**
 * @param {string} part One selector part.
 * @returns {boolean} True when the part can be used as root wrapper.
 */
function isRootSelectorPart(part) {
  return part === 'pre' || part === 'code';
}

/**
 * @param {string} selectorPart One selector part.
 * @returns {string|null} Scope for this selector part.
 */
function selectorPartToScope(selectorPart) {
  const classes = selectorPart.match(/\.[A-Za-z0-9_-]+/g) || [];
  const parts = [];

  for (const className of classes) {
    const part = normalizeClassName(className.slice(1));

    if (part && part !== 'default') {
      parts.push(part);
    }
  }

  if (parts.length === 0) {
    return null;
  }

  return parts.join('.');
}

/**
 * @param {string} html HTML output from highlight.js.
 * @returns {string[]} Unique scopes found in span classes.
 */
export function htmlToScopes(html) {
  const scopes = new Set();
  const spanRe = /<span\b[^>]*\sclass=(["'])(.*?)\1[^>]*>/gi;

  for (const match of String(html).matchAll(spanRe)) {
    const scope = classNamesToScope(match[2].trim().split(/\s+/));

    if (scope) {
      scopes.add(scope);
    }
  }

  return [...scopes].sort();
}

/**
 * @param {string[]} classNames Class names from one token.
 * @returns {string|null} Compound scope, or null when no class is useful.
 */
export function classNamesToScope(classNames) {
  const parts = classNames.map(normalizeClassName).filter(Boolean);

  return parts.length > 0 ? parts.join('.') : null;
}

/**
 * @param {string} className Raw highlight.js class name.
 * @returns {string|null} Normalized scope part.
 */
export function normalizeClassName(className) {
  if (className === 'hljs') {
    return 'default';
  }

  return className
    .replace(/^hljs-/, '')
    .replace(/_+$/, '');
}
