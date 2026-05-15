import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ansis from 'ansis';
import hljs from 'highlight.js';
import { output } from '../output.js';
import { htmlToScopes } from '../utils.js';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '../..');
const examplesDir = path.join(rootDir, 'examples');
const reportsDir = path.join(rootDir, 'reports');
const snippetsConfigPath = path.join(examplesDir, 'snippets.json');
const themeScopesPath = path.join(reportsDir, 'theme-scopes.json');

/**
 * Analyzes which token scopes are covered by example snippets.
 *
 * @returns {Promise<void>}
 */
export async function runAnalyzeSnippetsCoverage() {
  const snippetsConfig = JSON.parse(await fs.readFile(snippetsConfigPath, 'utf8'));
  const themeScopes = JSON.parse(await fs.readFile(themeScopesPath, 'utf8'));
  const snippets = [];
  const coveredScopes = new Set();

  for (const snippet of snippetsConfig) {
    const code = await fs.readFile(path.join(examplesDir, snippet.file), 'utf8');
    const result = hljs.highlight(code, {
      language: snippet.language,
      ignoreIllegals: true,
    });
    const scopes = htmlToScopes(result.value);

    for (const scope of scopes) {
      coveredScopes.add(scope);
    }

    snippets.push({
      ...snippet,
      scopes,
    });
  }

  const covered = [...coveredScopes].sort();
  const missing = themeScopes.scopes.filter((scope) => !coveredScopes.has(scope));
  const report = {
    snippetCount: snippets.length,
    themeScopeCount: themeScopes.scopeCount,
    coveredScopeCount: covered.length,
    missingScopeCount: missing.length,
    covered,
    missing,
    snippets,
  };

  await fs.mkdir(reportsDir, { recursive: true });
  await fs.writeFile(path.join(reportsDir, 'snippets-coverage.json'), `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(path.join(reportsDir, 'snippets-coverage.md'), renderMarkdown(report));

  output(`${ansis.green('Generated:')} ${ansis.cyan('reports/snippets-coverage.json')}`);
  output(`${ansis.green('Generated:')} ${ansis.cyan('reports/snippets-coverage.md')}`);
  output(`${ansis.green('Snippet count:')} ${ansis.cyan(report.snippetCount)}`);
  output(`${ansis.green('Covered scopes:')} ${ansis.cyan(`${report.coveredScopeCount}/${report.themeScopeCount}`)}`);
  output(`${ansis.green('Missing scopes:')} ${ansis.cyan(report.missingScopeCount)}`);
}

/**
 * @param {object} report Snippet coverage report.
 * @returns {string} Markdown report.
 */
function renderMarkdown(report) {
  const lines = [
    '# Snippet Scope Coverage',
    '',
    `Snippets: ${report.snippetCount}`,
    `Covered scopes: ${report.coveredScopeCount}/${report.themeScopeCount}`,
    `Missing scopes: ${report.missingScopeCount}`,
    '',
    '## Covered Scopes',
    '',
  ];

  for (const scope of report.covered) {
    lines.push(`- \`${scope}\``);
  }

  lines.push('');
  lines.push('## Missing Scopes');
  lines.push('');

  for (const scope of report.missing) {
    lines.push(`- \`${scope}\``);
  }

  lines.push('');
  lines.push('## Snippets');
  lines.push('');

  for (const snippet of report.snippets) {
    lines.push(`### ${snippet.name} (${snippet.language})`);
    lines.push('');

    for (const scope of snippet.scopes) {
      lines.push(`- \`${scope}\``);
    }

    lines.push('');
  }

  return `${lines.join('\n')}\n`;
}
