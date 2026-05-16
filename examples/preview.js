import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ansis from 'ansis';
import flaget from 'flaget';
import ansilight from '../src/index.js';
import { output } from '../tools/output.js';

const examplesDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(examplesDir, '..');
const themesDir = path.join(rootDir, 'themes');

const { flags } = flaget({
  array: ['theme', 'lang'],
  default: {
    background: true,
    footer: true,
    header: true,
    padding: undefined,
    width: 'content',
  },
});
const background = flags['no-background'] ? false : flags.background;
const footer = flags['no-footer'] ? false : normalizeBooleanFlag(flags.footer, true);
const header = flags['no-header'] ? false : normalizeBooleanFlag(flags.header, true);

if (!flags.theme && !flags.lang) {
  output(ansis.red('Error: --theme or --lang is required.'));
  output('Examples:');
  output('  node examples/preview.js --theme github');
  output('  node examples/preview.js --lang scss javascript');
  process.exit(1);
}

const group = normalizeGroup(flags.group || getDefaultGroup(flags));
const allSnippets = await loadSnippets();
const allThemeNames = await getThemeNames();
const snippets = selectSnippets(allSnippets, flags.lang);
const themes = await loadThemes(selectThemeNames(allThemeNames, flags.theme));
const blocks = createPreviewBlocks(group, themes, snippets);
const page = paginateBlocks(blocks, {
  start: flags.start,
  limit: flags.limit,
  hasExplicitTheme: Boolean(flags.theme),
  hasExplicitLang: Boolean(flags.lang),
});

renderBlocks(page.blocks);
if (footer) {
  renderPaginationInfo(page, {
    themes: themes.length,
    totalThemes: allThemeNames.length,
    languages: snippets.length,
    totalLanguages: allSnippets.length,
  });
}

function createPreviewBlocks(group, themes, snippets) {
  const blocks = [];

  if (group === 'theme') {
    for (const theme of themes) {
      for (const snippet of snippets) {
        blocks.push({ theme, snippet });
      }
    }

    return blocks;
  }

  for (const snippet of snippets) {
    for (const theme of themes) {
      blocks.push({ theme, snippet });
    }
  }

  return blocks;
}

function paginateBlocks(blocks, options) {
  const start = normalizeStart(options.start);
  const defaultLimit = options.hasExplicitTheme && options.hasExplicitLang ? blocks.length : 10;
  const limit = normalizeLimit(options.limit, defaultLimit);
  const end = Math.min(blocks.length, start + limit);

  return {
    blocks: blocks.slice(start, end),
    total: blocks.length,
    start,
    limit,
  };
}

function renderPaginationInfo(page, stats) {
  output();

  const shown = page.blocks.length;
  const message = `Preview: ${shown} of ${page.total} samples, start ${page.start}, limit ${page.limit} (Themes: ${stats.themes}/${stats.totalThemes}, Langs: ${stats.languages}/${stats.totalLanguages})`;

  output(ansis.gray(message));
}

function normalizeStart(value) {
  if (value === undefined) {
    return 0;
  }

  const start = Number(value);

  if (!Number.isInteger(start) || start < 0) {
    output(ansis.red(`Error: --start must be a non-negative integer, received: ${value}`));
    process.exit(1);
  }

  return start;
}

function normalizeLimit(value, defaultLimit) {
  if (value === undefined) {
    return defaultLimit;
  }

  const limit = Number(value);

  if (!Number.isInteger(limit) || limit <= 0) {
    output(ansis.red(`Error: --limit must be a positive integer, received: ${value}`));
    process.exit(1);
  }

  return limit;
}

function renderBlocks(blocks) {
  for (const block of blocks) {
    renderSnippet(block.theme, block.snippet);
  }
}

function renderSnippet(theme, snippet) {
  output();

  const source = snippet.code.trimEnd();
  const highlightedCode = ansilight(source, {
    background,
    lang: getHighlightLanguage(snippet.language),
    padding: flags.padding,
    theme: theme.theme,
    width: normalizeWidth(flags.width),
  });

  if (header) {
    output(renderHeader(theme.name, snippet, getBlockWidth(highlightedCode)));
  }

  output(highlightedCode);
}

function renderHeader(themeName, snippet, width) {
  const left = ` Theme: ${themeName}`;
  const right = `${snippet.name} (${snippet.language}) `;
  const gap = Math.max(1, width - visibleLength(left) - visibleLength(right));
  const text = `${left}${' '.repeat(gap)}${right}`;

  return ansis.hex('#aaa').bgHex('#333')(text);
}

function getBlockWidth(value) {
  return String(value).split('\n').reduce((width, line) => {
    const lineWidth = visibleLength(line);

    return Math.max(width, lineWidth);
  }, 0);
}

function visibleLength(value) {
  return ansis.strip(String(value)).length;
}

function normalizeGroup(value) {
  if (value === 'lang' || value === 'theme') {
    return value;
  }

  output(ansis.yellow(`Warning: unsupported group "${value}", fallback group: lang`));

  return 'lang';
}

function getDefaultGroup(flags) {
  if (flags.theme && !flags.lang) {
    return 'theme';
  }

  return 'lang';
}

function normalizeWidth(value) {
  const number = Number(value);

  return Number.isFinite(number) && value !== '' ? number : value;
}

function normalizeBooleanFlag(value, defaultValue) {
  if (value === undefined) {
    return defaultValue;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  return !['false', '0', 'no', 'off'].includes(String(value).toLowerCase());
}

function getHighlightLanguage(language) {
  return language.replace(/^extra-/, '');
}

async function loadSnippets() {
  const configPath = path.join(examplesDir, 'snippets.json');
  const configSource = await fs.readFile(configPath, 'utf8');
  const config = JSON.parse(configSource);

  return Promise.all(config.map(loadSnippet));
}

async function loadSnippet(snippet) {
  const filePath = path.join(examplesDir, snippet.file);
  const code = await fs.readFile(filePath, 'utf8');

  return {
    ...snippet,
    code,
  };
}

function selectSnippets(snippets, selectedLanguages) {
  if (!selectedLanguages) {
    return snippets;
  }

  const selected = new Set(selectedLanguages);
  const filtered = snippets.filter((snippet) => selected.has(snippet.language));
  const found = new Set(filtered.map((snippet) => snippet.language));

  for (const language of selected) {
    if (!found.has(language)) {
      output(ansis.yellow(`Warning: snippet language not found: ${language}`));
    }
  }

  if (filtered.length === 0) {
    output(ansis.red('Error: no snippets selected.'));
    process.exit(1);
  }

  return filtered;
}

async function getThemeNames() {
  const entries = await fs.readdir(themesDir, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.js'))
    .map((entry) => entry.name.replace(/\.js$/, ''))
    .sort();
}

function selectThemeNames(themeNames, selectedThemes) {
  if (!selectedThemes) {
    return themeNames;
  }

  const available = new Set(themeNames);
  const selected = [];

  for (const themeName of selectedThemes) {
    if (available.has(themeName)) {
      selected.push(themeName);
      continue;
    }

    output(ansis.yellow(`Warning: generated theme not found: ${themeName}`));
  }

  if (selected.length === 0) {
    output(ansis.red('Error: no themes selected.'));
    process.exit(1);
  }

  return selected;
}

function loadThemes(names) {
  return Promise.all(names.map(loadTheme));
}

function loadTheme(name) {
  const themePath = path.join(themesDir, `${name}.js`);
  const themeUrl = pathToFileURL(themePath).href;

  return import(themeUrl)
    .then((themeModule) => ({
      name,
      theme: themeModule.default,
    }))
    .catch((error) => {
      if (error.code === 'ERR_MODULE_NOT_FOUND') {
        output(ansis.red(`Error: generated theme not found: ${name}`));
        process.exit(1);
      }

      throw error;
    });
}
