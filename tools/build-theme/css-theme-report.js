import { selectorToScope } from '../utils.js';

const selectorReportGroups = [
  { title: 'SUPPORTED: root selectors' },
  { title: 'SUPPORTED: token selectors' },
  { title: 'SUPPORTED: compound selectors' },
  { title: 'SUPPORTED: nested selectors' },
  { title: 'UNSUPPORTED: ignored pseudo selectors' },
  { title: 'UNSUPPORTED: compound selectors' },
  { title: 'UNSUPPORTED: external language context selectors' },
  { title: 'UNSUPPORTED: non-token selectors' },
  { title: 'UNSUPPORTED: other selectors' },
];

/**
 * @param {object} report CSS theme report.
 * @param {Map<string, object>} report.selectors Selector report.
 * @param {object[]} report.imageBackgrounds Image background report.
 * @param {object[]} report.cssVariables CSS variable report.
 * @param {string[]} selectors Selectors to add.
 * @returns {void}
 */
export function addSelectorsToReport(report, selectors) {
  for (const selector of selectors) {
    const item = report.selectors.get(selector);

    if (item) {
      item.count += 1;
      continue;
    }

    report.selectors.set(selector, {
      selector,
      count: 1,
      group: groupSelector(selector),
    });
  }
}

/**
 * Renders selector and warning reports as markdown.
 *
 * The report separates supported selectors, unsupported selectors,
 * image background warnings, and unsupported CSS variables.
 *
 * @param {object} report CSS theme report.
 * @param {Map<string, object>} report.selectors Selector report.
 * @param {object[]} report.imageBackgrounds Image background report.
 * @param {object[]} report.cssVariables CSS variable report.
 * @returns {string} Markdown report.
 */
export function generateCssThemeReport(report) {
  const lines = [
    '# Theme CSS Selectors',
    '',
    'Generated during import of highlight.js CSS themes.',
    '',
    'Supported CSS selectors are converted into ANSI theme rules.',
    'Unsupported selectors are ignored and listed here for review.',
    '',
  ];

  for (const group of selectorReportGroups) {
    const items = [...report.selectors.values()]
      .filter((item) => item.group === group.title)
      .sort(compareSelectorReportItems);

    if (items.length === 0) {
      continue;
    }

    lines.push(`## ${group.title}`);
    lines.push('');

    for (const item of items) {
      lines.push(`- \`${item.selector}\` (${item.count})`);
    }

    lines.push('');
  }

  const imageBackgrounds = [...report.imageBackgrounds].sort(compareImageBackgrounds);
  const warningImageBackgrounds = imageBackgrounds.filter((item) => item.fallbackBackground);
  const unsupportedImageBackgrounds = imageBackgrounds.filter((item) => !item.fallbackBackground);

  if (warningImageBackgrounds.length > 0) {
    lines.push('## WARNING: image backgrounds');
    lines.push('');

    for (const item of warningImageBackgrounds) {
      lines.push(`- \`${item.theme}\`: \`${item.selector}\` { ${item.property}: \`${item.value}\` }`);
      lines.push(`  - image: \`${item.image}\``);
      lines.push(`  - fallback background: \`${item.fallbackBackground}\``);
    }

    lines.push('');
  }

  if (unsupportedImageBackgrounds.length > 0) {
    lines.push('## UNSUPPORTED: image backgrounds');
    lines.push('');

    for (const item of unsupportedImageBackgrounds) {
      lines.push(`- \`${item.theme}\`: \`${item.selector}\` { ${item.property}: \`${item.value}\` }`);
      lines.push(`  - image: \`${item.image}\``);
    }

    lines.push('');
  }

  const cssVariables = [...report.cssVariables].sort(compareCssVariables);

  if (cssVariables.length > 0) {
    lines.push('## UNSUPPORTED: CSS variables');
    lines.push('');

    for (const item of cssVariables) {
      lines.push(`- \`${item.theme}\`: \`${item.selector}\` { ${item.property}: \`${item.value}\` }`);
      lines.push(`  - variable: \`${item.variable}\``);

      if (item.fallback) {
        lines.push(`  - fallback: \`${item.fallback}\``);
      }

      lines.push(`  - reason: ${item.reason}`);
    }

    lines.push('');
  }

  return `${lines.join('\n').trimEnd()}\n`;
}

/**
 * Groups a CSS selector by converter support status.
 *
 * This is used only for the review report.
 * Real conversion is still done by selectorToScope().
 *
 * @param {string} selector CSS selector.
 * @returns {string} Report group title.
 */
export function groupSelector(selector) {
  const scope = selectorToScope(selector);

  if (scope === 'default') {
    return 'SUPPORTED: root selectors';
  }

  if (scope) {
    if (scope.includes(' ')) {
      return 'SUPPORTED: nested selectors';
    }

    if (scope.includes('.')) {
      return 'SUPPORTED: compound selectors';
    }

    return 'SUPPORTED: token selectors';
  }

  if (/:/.test(selector)) {
    return 'UNSUPPORTED: ignored pseudo selectors';
  }

  if (/[>+~]/.test(selector)) {
    return 'UNSUPPORTED: compound selectors';
  }

  if (isExternalLanguageContextSelector(selector)) {
    return 'UNSUPPORTED: external language context selectors';
  }

  if (selector.includes('.hljs')) {
    return 'UNSUPPORTED: non-token selectors';
  }

  return 'UNSUPPORTED: other selectors';
}

/**
 * @param {object} a First selector report item.
 * @param {object} b Second selector report item.
 * @returns {number} Sort order.
 */
function compareSelectorReportItems(a, b) {
  if (b.count !== a.count) {
    return b.count - a.count;
  }

  return a.selector.localeCompare(b.selector);
}

/**
 * @param {object} a First image background report item.
 * @param {object} b Second image background report item.
 * @returns {number} Sort order.
 */
function compareImageBackgrounds(a, b) {
  return `${a.theme} ${a.selector}`.localeCompare(`${b.theme} ${b.selector}`);
}

/**
 * @param {object} a First CSS variable report item.
 * @param {object} b Second CSS variable report item.
 * @returns {number} Sort order.
 */
function compareCssVariables(a, b) {
  return `${a.theme} ${a.selector} ${a.property}`.localeCompare(`${b.theme} ${b.selector} ${b.property}`);
}

/**
 * @param {string} selector CSS selector.
 * @returns {boolean} True when selector depends on language wrapper class.
 */
function isExternalLanguageContextSelector(selector) {
  return /(?:^|\s)\.(?:language-[A-Za-z0-9_-]+|ruby|diff|xml)(?:\s|$|\.)/.test(selector);
}
