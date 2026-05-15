import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ansis from 'ansis';
import flaget from 'flaget';
import { output } from '../output.js';
import {
  collectCssSelectors,
  parseCssTheme,
} from './css-theme-parser.js';
import {
  addSelectorsToReport,
  generateCssThemeReport,
} from './css-theme-report.js';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '../..');
const stylesDir = path.join(rootDir, 'node_modules', 'highlight.js', 'styles');
const targetDir = path.join(rootDir, 'themes');
const reportsDir = path.join(rootDir, 'reports');
const patchPath = path.join(targetDir, 'theme-patch.json');

/**
 * Builds requested themes from CLI arguments.
 *
 * @param {string[]} [rawArgs] CLI arguments.
 * @returns {void}
 */
export function runBuildTheme(rawArgs = process.argv.slice(2)) {
  const options = flaget({
    array: ['name'],
    raw: rawArgs,
  });
  const themeIndex = createThemeIndex(stylesDir);
  const themeNames = getThemeNames(options, themeIndex);
  const report = createReport();
  // Manual escape hatch for CSS details that cannot be converted reliably.
  // Keep it even when empty: generated ANSI themes may need hand-tuned overrides.
  const themePatches = readThemePatches(patchPath);

  fs.mkdirSync(targetDir, { recursive: true });
  fs.mkdirSync(reportsDir, { recursive: true });

  for (const themeName of themeNames) {
    buildTheme(themeName, themeIndex, themePatches, report);
  }

  writeCssThemeReport(report);
}

/**
 * Builds one ANSI theme and adds data to reports.
 *
 * @param {string} themeName Generated theme name.
 * @param {Record<string, string>} themeIndex Theme name to CSS path map.
 * @param {object} themePatches Manual theme patches.
 * @param {object} report Build report data.
 * @param {Map<string, object>} report.selectors Selector report.
 * @param {object[]} report.imageBackgrounds Image background report.
 * @param {object[]} report.cssVariables CSS variable report.
 * @returns {void}
 */
function buildTheme(themeName, themeIndex, themePatches, report) {
  const sourcePath = themeIndex[themeName];
  const targetPath = path.join(targetDir, `${themeName}.js`);

  if (!sourcePath) {
    const label = ansis.yellow('Warning:');
    const missingTheme = ansis.red(themeName);

    output(`${label} highlight.js theme not found: ${missingTheme}`);
    return;
  }

  const css = fs.readFileSync(sourcePath, 'utf8');

  addSelectorsToReport(report, collectCssSelectors(css));

  const result = parseCssTheme(css, {
    name: themeName,
    sourceDir: getThemeSourceDir(stylesDir, sourcePath),
  });
  const theme = applyThemePatch(result.theme, themePatches[themeName]);

  report.imageBackgrounds.push(...result.imageBackgrounds);
  report.cssVariables.push(...result.cssVariables);

  fs.writeFileSync(targetPath, generateThemeModule(theme, {
    source: `highlight.js/styles/${path.relative(stylesDir, sourcePath)}`,
  }));

  const generatedPath = ansis.cyan(path.relative(rootDir, targetPath));
  const appliedRules = ansis.cyan(result.stats.appliedRules);

  output(`${ansis.green('Generated:')} ${generatedPath}`);
  output(`${ansis.green('Applied rules:')} ${appliedRules}`);

  if (result.warnings.length > 0) {
    output(ansis.yellow('Warnings:'));

    for (const warning of result.warnings) {
      output(`  ${ansis.yellow('-')} ${warning.message}`);
    }
  }
}

/**
 * @param {object} report Build report data.
 * @param {Map<string, object>} report.selectors Selector report.
 * @param {object[]} report.imageBackgrounds Image background report.
 * @param {object[]} report.cssVariables CSS variable report.
 * @returns {void}
 */
function writeCssThemeReport(report) {
  const reportPath = path.join(reportsDir, 'build-css-themes.md');
  const reportSource = generateCssThemeReport(report);

  fs.writeFileSync(reportPath, reportSource);

  const generatedPath = ansis.cyan(path.relative(rootDir, reportPath));

  output(`${ansis.green('Generated:')} ${generatedPath}`);
}

/**
 * @returns {{selectors: Map<string, object>, imageBackgrounds: object[], cssVariables: object[]}} Build report data.
 */
function createReport() {
  return {
    selectors: new Map(),
    imageBackgrounds: [],
    cssVariables: [],
  };
}

/**
 * @param {object} theme ANSI theme object.
 * @param {{source?: string}} [options] Module metadata.
 * @returns {string} JavaScript module source.
 */
function generateThemeModule(theme, options = {}) {
  const source = [
    `// Generated from ${options.source || 'highlight.js CSS theme'}.`,
    '',
    'export default {',
  ];

  for (const scope of Object.keys(theme).sort()) {
    const key = formatKey(scope);
    const style = formatStyle(theme[scope]);

    source.push(`  ${key}: ${style},`);
  }

  source.push('};');
  source.push('');

  return source.join('\n');
}

/**
 * Applies manual fixes to a generated theme.
 *
 * This is an escape hatch for CSS details that cannot be converted well.
 * A null value removes a property.
 *
 * @param {object} theme Generated theme object.
 * @param {object|undefined} patch Manual patch for one theme.
 * @returns {object} Patched theme object.
 */
export function applyThemePatch(theme, patch) {
  if (!patch) {
    return theme;
  }

  const patchedTheme = structuredClone(theme);

  for (const [scope, declarations] of Object.entries(patch)) {
    patchedTheme[scope] = {
      ...patchedTheme[scope],
    };

    for (const [property, value] of Object.entries(declarations)) {
      if (value === null) {
        delete patchedTheme[scope][property];
        continue;
      }

      patchedTheme[scope][property] = value;
    }
  }

  return patchedTheme;
}

/**
 * @param {string} key Theme scope key.
 * @returns {string} JavaScript object key.
 */
function formatKey(key) {
  return /^[A-Za-z_$][\w$]*$/.test(key) ? key : JSON.stringify(key);
}

/**
 * @param {object} style Theme style declaration.
 * @returns {string} JavaScript object value.
 */
function formatStyle(style) {
  const props = Object.keys(style).sort().map((key) => {
    const value = JSON.stringify(style[key]);

    return `${key}: ${value}`;
  });

  return `{ ${props.join(', ')} }`;
}

/**
 * @param {string} patchPath Path to theme patch JSON.
 * @returns {object} Theme patches.
 */
function readThemePatches(patchPath) {
  if (!fs.existsSync(patchPath)) {
    return {};
  }

  return JSON.parse(fs.readFileSync(patchPath, 'utf8'));
}

/**
 * @param {object} options CLI options from flaget.
 * @param {Record<string, string>} themeIndex Theme name to CSS path map.
 * @returns {string[]} Theme names to build.
 */
function getThemeNames(options, themeIndex) {
  if (options.flags.all) {
    if (options.flags.name || options._.length > 0) {
      const warning = ansis.yellow('Warning:');

      output(`${warning} --all is used, --name and positional theme names are ignored.`);
    }

    return Object.keys(themeIndex).sort();
  }

  if (options.flags.config) {
    const configPath = path.resolve(rootDir, options.flags.config);
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    return normalizeThemeNames(config.themes || config);
  }

  return normalizeThemeNames(options.flags.name || options._ || ['default']);
}

/**
 * @param {string} stylesDir highlight.js styles directory.
 * @param {string} sourcePath CSS theme path.
 * @returns {string} Source directory path for reports.
 */
function getThemeSourceDir(stylesDir, sourcePath) {
  const relativeDir = path.dirname(path.relative(stylesDir, sourcePath));

  if (relativeDir === '.') {
    return 'node_modules/highlight.js/styles';
  }

  return `node_modules/highlight.js/styles/${relativeDir}`;
}

/**
 * @param {string} stylesDir highlight.js styles directory.
 * @returns {Record<string, string>} Theme name to CSS path map.
 */
function createThemeIndex(stylesDir) {
  const index = {};

  for (const filePath of findCssFiles(stylesDir)) {
    const themeName = getThemeName(stylesDir, filePath);

    if (index[themeName]) {
      const warning = ansis.yellow('Warning:');
      const duplicateTheme = ansis.red(themeName);

      output(`${warning} duplicate highlight.js theme name ignored: ${duplicateTheme}`);
      continue;
    }

    index[themeName] = filePath;
  }

  return index;
}

/**
 * @param {string} dir Directory to scan.
 * @returns {string[]} CSS theme files.
 */
function findCssFiles(dir) {
  const files = [];

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const entryPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...findCssFiles(entryPath));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.css') && !entry.name.endsWith('.min.css')) {
      files.push(entryPath);
    }
  }

  return files.sort();
}

/**
 * @param {string} stylesDir highlight.js styles directory.
 * @param {string} filePath CSS theme path.
 * @returns {string} Generated theme name.
 */
function getThemeName(stylesDir, filePath) {
  return path.relative(stylesDir, filePath)
    .replace(/\.css$/, '')
    .split(path.sep)
    .join('-');
}

/**
 * @param {string|string[]} themeNames Theme names from CLI or config.
 * @returns {string[]} Unique theme names.
 */
function normalizeThemeNames(themeNames) {
  if (!Array.isArray(themeNames)) {
    return [themeNames].filter(Boolean);
  }

  return [...new Set(themeNames)].filter(Boolean);
}
