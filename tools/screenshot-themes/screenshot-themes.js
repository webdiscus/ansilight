#!/usr/bin/env node

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import ansis from 'ansis';
import flaget from 'flaget';
import sharp from 'sharp';
import { output } from '../output.js';

const execFileAsync = promisify(execFile);
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '../..');
const themesDir = path.join(rootDir, 'themes');
const defaultConfigPath = path.join(scriptDir, 'screenshot-themes.config.example.json');

const { flags } = flaget({
  raw: process.argv.slice(2),
});

const config = await readConfig(flags.config || defaultConfigPath);
const themeNames = await getThemeNames(config.themes);
const outputDir = path.resolve(rootDir, config.outputDir || 'docs/theme-screenshots');
const galleryPath = path.resolve(rootDir, config.galleryPath || 'docs/theme-gallery.md');

await checkScreenRecordingPermission();
await fs.mkdir(outputDir, { recursive: true });
await fs.mkdir(path.dirname(galleryPath), { recursive: true });

const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ansilight-theme-screenshots-'));
let window = null;

try {
  window = await openTermWindow({
    bounds: config.window,
    openWindowDelay: config.openWindowDelay,
  });
  const cropRect = await detectCaptureRect(config, tempDir, window);

  for (const themeName of themeNames) {
    const screenshotPath = path.join(outputDir, `${themeName}.png`);
    const fullScreenshotPath = path.join(tempDir, `${themeName}-full.png`);
    const command = createPreviewCommand(themeName, config);

    await runPreviewAndCapture(window, command, fullScreenshotPath, config);
    await writeScreenshot(fullScreenshotPath, screenshotPath, cropRect);

    output(`${ansis.green('Generated:')} ${ansis.cyan(path.relative(rootDir, screenshotPath))}`);
  }

  await fs.writeFile(galleryPath, createGalleryMarkdown(themeNames, outputDir, galleryPath, config));
  output(`${ansis.green('Generated:')} ${ansis.cyan(path.relative(rootDir, galleryPath))}`);
} finally {
  if (window && config.closeWindow) {
    await closeTermWindow(window.id);
  }

  await fs.rm(tempDir, { recursive: true, force: true });
}

/**
 * @param {string} configPath Path to JSON config.
 * @returns {Promise<object>} Parsed config.
 */
async function readConfig(configPath) {
  const source = await fs.readFile(path.resolve(rootDir, configPath), 'utf8');

  return JSON.parse(source);
}

/**
 * Checks macOS Screen Recording permission before opening iTerm.
 *
 * @returns {Promise<void>}
 */
async function checkScreenRecordingPermission() {
  const checkPath = path.join(os.tmpdir(), 'ansilight-screencheck.png');

  try {
    await execFileAsync('screencapture', ['-x', checkPath]);
    await fs.rm(checkPath, { force: true });
  } catch {
    output(ansis.red('Error: macOS Screen Recording permission is required.'));
    output();
    output('Open System Settings -> Privacy & Security -> Screen Recording.');
    output('Enable permission for the app that runs this script:');
    output('- iTerm2');
    output('- Terminal');
    output('- PhpStorm');
    output();
    output('Then restart that app and run this tool again.');

    await openScreenRecordingSettings();
    process.exit(1);
  }
}

/**
 * @returns {Promise<void>}
 */
async function openScreenRecordingSettings() {
  await execFileAsync('open', [
    'x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture',
  ]);
}

/**
 * @param {string[]|undefined} selectedThemes Theme names from config.
 * @returns {Promise<string[]>} Theme names to screenshot.
 */
async function getThemeNames(selectedThemes) {
  const entries = await fs.readdir(themesDir, { withFileTypes: true });
  const themeNames = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.js'))
    .map((entry) => entry.name.replace(/\.js$/, ''))
    .sort();

  if (Array.isArray(selectedThemes) && selectedThemes.length > 0) {
    const availableThemes = new Set(themeNames);
    const foundThemes = [];

    for (const themeName of selectedThemes) {
      if (availableThemes.has(themeName)) {
        foundThemes.push(themeName);
        continue;
      }

      output(ansis.yellow(`Warning: generated theme not found: ${themeName}`));
    }

    if (foundThemes.length === 0) {
      output(ansis.red('Error: no themes selected.'));
      process.exit(1);
    }

    return foundThemes;
  }

  return themeNames;
}

/**
 * @param {string} themeName Theme name.
 * @param {object} config Screenshot config.
 * @returns {string} Shell command for iTerm.
 */
function createPreviewCommand(themeName, config) {
  const args = [
    'node',
    'examples/preview.js',
    '--theme',
    themeName,
    '--lang',
    config.lang || 'javascript',
    '--group',
    'theme',
    `--width=${config.width || 100}`,
    `--padding=${config.padding ?? 1}`,
    `--start=${config.start ?? 0}`,
    `--limit=${config.limit ?? 1}`,
  ];

  if (config.header === false) {
    args.push('--no-header');
  }

  if (config.footer === false) {
    args.push('--no-footer');
  }

  return [
    `printf ${quoteShell('\\033c')}`,
    `cd ${quoteShell(rootDir)}`,
    args.map(quoteShell).join(' '),
  ].join(' && ');
}

/**
 * Finds the sample block rectangle from a default-theme probe screenshot.
 *
 * @param {object} config Screenshot config.
 * @param {string} tempDir Temporary directory.
 * @param {{id: string, bounds: object}} window iTerm window data.
 * @returns {Promise<object|null>} Crop rectangle for sharp.
 */
async function detectCaptureRect(config, tempDir, window) {
  if (config.crop !== undefined && config.crop !== 'auto') {
    return null;
  }

  const probePath = path.join(tempDir, 'probe-default.png');
  const probeConfig = {
    ...config,
    footer: false,
    header: false,
  };
  const command = createPreviewCommand('default', probeConfig);

  await runPreviewAndCapture(window, command, probePath, config);

  const background = await readThemeBackground('default');
  const rect = await findBackgroundRect(probePath, background, {
    tolerance: normalizePositiveInteger(config.cropTolerance, 24),
    padding: normalizeInteger(config.cropPadding, 0),
  });

  output(`${ansis.green('Detected crop:')} ${ansis.cyan(`${rect.left},${rect.top},${rect.width},${rect.height}`)}`);

  return rect;
}

/**
 * @param {string} themeName Theme name.
 * @returns {Promise<string>} Theme default background.
 */
async function readThemeBackground(themeName) {
  const themePath = path.join(themesDir, `${themeName}.js`);
  const themeModule = await import(pathToFileURL(themePath).href);
  const background = themeModule.default?.default?.background;

  if (!background) {
    throw new Error(`Theme has no default background: ${themeName}`);
  }

  return background;
}

/**
 * Finds the largest vertical band that matches a background color.
 *
 * @param {string} imagePath Probe PNG path.
 * @param {string} background HEX background color.
 * @param {{tolerance: number, padding: number}} options Detection options.
 * @returns {Promise<{left: number, top: number, width: number, height: number}>} Crop rectangle.
 */
async function findBackgroundRect(imagePath, background, options) {
  const target = parseHexColor(background);
  const image = sharp(imagePath);
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  const rows = findBackgroundRows(data, info, target, options.tolerance);
  const band = findLargestRowBand(rows);

  if (!band) {
    throw new Error(`Cannot detect sample block background: ${background}`);
  }

  return padRect({
    left: band.left,
    top: band.top,
    width: band.right - band.left + 1,
    height: band.bottom - band.top + 1,
  }, options.padding, info);
}

/**
 * @param {Buffer} data Raw image data.
 * @param {object} info Sharp image info.
 * @param {{red: number, green: number, blue: number}} target Target color.
 * @param {number} tolerance Color tolerance.
 * @returns {object[]} Rows with enough background pixels.
 */
function findBackgroundRows(data, info, target, tolerance) {
  const rows = [];
  const minPixels = Math.max(20, Math.floor(info.width * 0.1));

  for (let y = 0; y < info.height; y += 1) {
    let count = 0;
    let left = info.width;
    let right = -1;

    for (let x = 0; x < info.width; x += 1) {
      const offset = (y * info.width + x) * info.channels;

      if (!matchesColor(data, offset, target, tolerance)) {
        continue;
      }

      count += 1;
      left = Math.min(left, x);
      right = Math.max(right, x);
    }

    if (count >= minPixels) {
      rows.push({ y, left, right, count });
    }
  }

  return rows;
}

/**
 * @param {object[]} rows Rows with background pixels.
 * @returns {object|null} Largest row band.
 */
function findLargestRowBand(rows) {
  let bestBand = null;
  let currentBand = null;

  for (const row of rows) {
    if (!currentBand || row.y !== currentBand.bottom + 1) {
      currentBand = createRowBand(row);
    } else {
      currentBand.bottom = row.y;
      currentBand.left = Math.min(currentBand.left, row.left);
      currentBand.right = Math.max(currentBand.right, row.right);
      currentBand.score += row.count;
    }

    if (!bestBand || currentBand.score > bestBand.score) {
      bestBand = { ...currentBand };
    }
  }

  return bestBand;
}

/**
 * @param {object} row Background row.
 * @returns {object} Row band.
 */
function createRowBand(row) {
  return {
    top: row.y,
    bottom: row.y,
    left: row.left,
    right: row.right,
    score: row.count,
  };
}

/**
 * @param {object} rect Crop rectangle.
 * @param {number} padding Padding in pixels.
 * @param {object} info Sharp image info.
 * @returns {object} Padded crop rectangle.
 */
function padRect(rect, padding, info) {
  const left = Math.max(0, rect.left - padding);
  const top = Math.max(0, rect.top - padding);
  const right = Math.min(info.width, rect.left + rect.width + padding);
  const bottom = Math.min(info.height, rect.top + rect.height + padding);

  return {
    left,
    top,
    width: right - left,
    height: bottom - top,
  };
}

/**
 * @param {Buffer} data Raw image data.
 * @param {number} offset Pixel offset.
 * @param {{red: number, green: number, blue: number}} target Target color.
 * @param {number} tolerance Color tolerance.
 * @returns {boolean} True when pixel matches target.
 */
function matchesColor(data, offset, target, tolerance) {
  return Math.abs(data[offset] - target.red) <= tolerance
    && Math.abs(data[offset + 1] - target.green) <= tolerance
    && Math.abs(data[offset + 2] - target.blue) <= tolerance;
}

/**
 * @param {string} value HEX color.
 * @returns {{red: number, green: number, blue: number}} RGB color.
 */
function parseHexColor(value) {
  const hex = String(value).replace(/^#/, '');
  const fullHex = hex.length === 3
    ? hex.split('').map((char) => char + char).join('')
    : hex;

  return {
    red: Number.parseInt(fullHex.slice(0, 2), 16),
    green: Number.parseInt(fullHex.slice(2, 4), 16),
    blue: Number.parseInt(fullHex.slice(4, 6), 16),
  };
}

/**
 * @param {string} sourcePath Full screenshot path.
 * @param {string} targetPath Final screenshot path.
 * @param {object|null} cropRect Crop rectangle.
 * @returns {Promise<void>}
 */
async function writeScreenshot(sourcePath, targetPath, cropRect) {
  if (!cropRect) {
    await fs.copyFile(sourcePath, targetPath);
    return;
  }

  await sharp(sourcePath).extract(cropRect).toFile(targetPath);
}

/**
 * Opens one iTerm window for all screenshots.
 *
 * @param {object} options Open window options.
 * @param {object|undefined} options.bounds iTerm window bounds.
 * @param {number|undefined} options.openWindowDelay Delay after opening the window, in milliseconds.
 * @returns {Promise<{id: string, bounds: object}>} iTerm window data.
 */
async function openTermWindow(options) {
  const bounds = normalizeWindowBounds(options.bounds);
  const openWindowDelay = normalizePositiveInteger(options.openWindowDelay, 800) / 1000;
  const script = `
tell application "iTerm2"
  activate
  set newWindow to (create window with default profile)
  set bounds of newWindow to {${bounds.left}, ${bounds.top}, ${bounds.right}, ${bounds.bottom}}
  delay ${openWindowDelay}
  return id of newWindow
end tell
`;
  const { stdout } = await execFileAsync('osascript', ['-e', script]);

  return {
    id: stdout.trim(),
    bounds,
  };
}

/**
 * Sends a preview command to the existing iTerm window and captures it.
 *
 * @param {{id: string, bounds: object}} window iTerm window data.
 * @param {string} command Shell command.
 * @param {string} screenshotPath Full screenshot path.
 * @param {object} config Screenshot config.
 * @returns {Promise<void>}
 */
async function runPreviewAndCapture(window, command, screenshotPath, config) {
  await runTermCommand(window.id, command);
  await sleep(normalizePositiveInteger(config.displayDelay, 150));
  await captureWindow(window.bounds, screenshotPath);
}

/**
 * @param {string} windowId iTerm window id.
 * @param {string} command Shell command.
 * @returns {Promise<void>}
 */
async function runTermCommand(windowId, command) {
  const script = `
tell application "iTerm2"
  tell window id ${Number(windowId)}
    tell current session
      write text ${quoteAppleScript(command)}
    end tell
  end tell
end tell
`;

  await execFileAsync('osascript', ['-e', script]);
}

/**
 * @param {string} windowId iTerm window id.
 * @returns {Promise<void>}
 */
async function closeTermWindow(windowId) {
  const script = `
tell application "iTerm2"
  close window id ${Number(windowId)}
end tell
`;

  await execFileAsync('osascript', ['-e', script]);
}

/**
 * Captures the configured screen rectangle.
 *
 * iTerm AppleScript window ids are not macOS CGWindowIDs, so screencapture -l
 * cannot use them. The tool captures the same rectangle that was assigned to
 * the iTerm window.
 *
 * @param {{left: number, top: number, right: number, bottom: number}} bounds Screen rectangle.
 * @param {string} screenshotPath PNG output path.
 * @returns {Promise<void>}
 */
async function captureWindow(bounds, screenshotPath) {
  const rect = [
    bounds.left,
    bounds.top,
    bounds.right - bounds.left,
    bounds.bottom - bounds.top,
  ].join(',');

  await execFileAsync('screencapture', ['-x', '-R', rect, screenshotPath]);
}

/**
 * @param {string[]} themeNames Theme names.
 * @param {string} outputDir Screenshot directory.
 * @param {string} galleryPath Markdown gallery path.
 * @param {object} config Screenshot config.
 * @returns {string} Markdown source.
 */
function createGalleryMarkdown(themeNames, outputDir, galleryPath, config) {
  const columns = normalizeColumns(config.galleryColumns);
  const lines = [
    '# Theme Gallery',
    '',
    `${themeNames.length} ANSI truecolor themes converted from original [highlight.js CSS styles](https://github.com/highlightjs/highlight.js/tree/main/src/styles)`,
    '([examples](https://highlightjs.org/examples)).',
    '',
    'Screenshots captured from iTerm.',
    '',
    `| ${Array.from({ length: columns }, () => 'Theme').join(' | ')} |`,
    `| ${Array.from({ length: columns }, () => '---').join(' | ')} |`,
  ];

  for (let index = 0; index < themeNames.length; index += columns) {
    const row = themeNames.slice(index, index + columns).map((themeName) => {
      const imagePath = path.join(outputDir, `${themeName}.png`);
      const imageRelativePath = toPosixPath(path.relative(path.dirname(galleryPath), imagePath));
      const themeRelativePath = toPosixPath(path.relative(path.dirname(galleryPath), path.join(themesDir, `${themeName}.js`)));

      return `**[${themeName}](${themeRelativePath})**<br>[![${themeName}](${imageRelativePath})](${imageRelativePath})`;
    });

    while (row.length < columns) {
      row.push('');
    }

    lines.push(`| ${row.join(' | ')} |`);
  }

  lines.push('');

  return lines.join('\n');
}

/**
 * @param {unknown} value Raw column count.
 * @returns {number} Gallery column count.
 */
function normalizeColumns(value) {
  const columns = normalizeInteger(value, 2);

  return Math.min(5, Math.max(1, columns));
}

/**
 * @param {object|undefined} bounds Window bounds from config.
 * @returns {{left: number, top: number, right: number, bottom: number}} iTerm window bounds.
 */
function normalizeWindowBounds(bounds) {
  return {
    left: normalizeInteger(bounds?.left, 80),
    top: normalizeInteger(bounds?.top, 80),
    right: normalizeInteger(bounds?.right, 1180),
    bottom: normalizeInteger(bounds?.bottom, 760),
  };
}

/**
 * @param {unknown} value Raw value.
 * @param {number} fallback Fallback value.
 * @returns {number} Integer value.
 */
function normalizeInteger(value, fallback) {
  const number = Number(value);

  return Number.isInteger(number) ? number : fallback;
}

/**
 * @param {unknown} value Raw value.
 * @param {number} fallback Fallback value.
 * @returns {number} Positive integer value.
 */
function normalizePositiveInteger(value, fallback) {
  const number = normalizeInteger(value, fallback);

  return number > 0 ? number : fallback;
}

/**
 * @param {string} value Shell argument.
 * @returns {string} Quoted shell argument.
 */
function quoteShell(value) {
  return `'${String(value).replaceAll("'", "'\\''")}'`;
}

/**
 * @param {string} value AppleScript string.
 * @returns {string} Quoted AppleScript string.
 */
function quoteAppleScript(value) {
  return JSON.stringify(String(value));
}

/**
 * @param {number} ms Delay in milliseconds.
 * @returns {Promise<void>} Delay promise.
 */
function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * @param {string} value File path.
 * @returns {string} POSIX path.
 */
function toPosixPath(value) {
  return value.split(path.sep).join('/');
}
