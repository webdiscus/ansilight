import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ansis from 'ansis';
import { output } from '../output.js';
import { selectorToScope } from '../utils.js';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '../..');
const stylesDir = path.join(rootDir, 'node_modules', 'highlight.js', 'styles');
const reportsDir = path.join(rootDir, 'reports');

/**
 * Analyzes token scopes used by highlight.js CSS themes.
 *
 * @returns {Promise<void>}
 */
export async function runAnalyzeThemeScopes() {
  const themes = await findCssFiles(stylesDir);
  const scopesByTheme = Object.create(null);
  const themesByScope = Object.create(null);

  for (const themePath of themes) {
    const themeName = path.relative(stylesDir, themePath).replace(/\.css$/, '');
    const css = await fs.readFile(themePath, 'utf8');
    const scopes = extractThemeScopes(css);

    scopesByTheme[themeName] = scopes;

    for (const scope of scopes) {
      themesByScope[scope] ||= [];
      themesByScope[scope].push(themeName);
    }
  }

  const scopes = Object.keys(themesByScope).sort();
  const report = {
    themeCount: themes.length,
    scopeCount: scopes.length,
    scopes,
    themesByScope,
    scopesByTheme,
  };

  await fs.mkdir(reportsDir, { recursive: true });
  await fs.writeFile(path.join(reportsDir, 'theme-scopes.json'), `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(path.join(reportsDir, 'theme-scopes.md'), renderMarkdown(report));

  output(`${ansis.green('Generated:')} ${ansis.cyan('reports/theme-scopes.json')}`);
  output(`${ansis.green('Generated:')} ${ansis.cyan('reports/theme-scopes.md')}`);
  output(`${ansis.green('Theme count:')} ${ansis.cyan(report.themeCount)}`);
  output(`${ansis.green('Scope count:')} ${ansis.cyan(report.scopeCount)}`);
}

/**
 * @param {string} dir Directory to scan.
 * @returns {Promise<string[]>} CSS theme files.
 */
async function findCssFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...await findCssFiles(entryPath));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.css') && !entry.name.endsWith('.min.css')) {
      files.push(entryPath);
    }
  }

  return files.sort();
}

/**
 * @param {string} css CSS theme source.
 * @returns {string[]} Theme scopes used by selectors.
 */
function extractThemeScopes(css) {
  const scopes = new Set();
  const ruleRe = /([^{}]+)\{[^{}]*\}/g;

  for (const match of stripComments(String(css)).matchAll(ruleRe)) {
    const selectors = match[1].split(',').map((selector) => selector.trim()).filter(Boolean);

    for (const selector of selectors) {
      const scope = selectorToScope(selector);

      if (scope) {
        scopes.add(scope);
      }
    }
  }

  return [...scopes].sort();
}

/**
 * @param {string} css CSS source.
 * @returns {string} CSS without comments.
 */
function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

/**
 * @param {object} report Theme scope report.
 * @returns {string} Markdown report.
 */
function renderMarkdown(report) {
  const lines = [
    '# highlight.js Theme Scopes',
    '',
    `Themes scanned: ${report.themeCount}`,
    `Scopes found: ${report.scopeCount}`,
    '',
    '## Scopes',
    '',
  ];

  for (const scope of report.scopes) {
    lines.push(`- \`${scope}\` (${report.themesByScope[scope].length})`);
  }

  lines.push('');
  lines.push('## Themes');
  lines.push('');

  for (const themeName of Object.keys(report.scopesByTheme).sort()) {
    lines.push(`### ${themeName}`);
    lines.push('');

    for (const scope of report.scopesByTheme[themeName]) {
      lines.push(`- \`${scope}\``);
    }

    lines.push('');
  }

  return `${lines.join('\n')}\n`;
}
