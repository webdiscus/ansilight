import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import '../../test/env/truecolor.js';
import ansis from 'ansis';
import ansilight from '../../src/index.js';
import { output } from '../output.js';
import { DEFAULT_THEME } from '../../src/options.js';
import { findSourceFiles } from '../utils.js';

const toolDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(toolDir, '../..');
const markupDir = path.join(rootDir, 'test', 'markup');

/**
 * Updates ANSI expected fixture files.
 *
 * @returns {void}
 */
export function runUpdateTestExpects() {
  const files = findSourceFiles(markupDir);

  for (const sourcePath of files) {
    updateExpectedFile(sourcePath);
  }

  output(`${ansis.green('Updated ANSI expects:')} ${ansis.cyan(files.length)}`);
}

/**
 * @param {string} sourcePath Source fixture path.
 * @returns {void}
 */
function updateExpectedFile(sourcePath) {
  const language = path.basename(path.dirname(sourcePath));
  const source = fs.readFileSync(sourcePath, 'utf8');
  const actual = ansilight(source, {
    background: false,
    language,
    padding: 0,
    theme: DEFAULT_THEME,
    width: 'content',
  });
  const expectedPath = sourcePath.replace(/\.txt$/, '.expect.txt');

  fs.writeFileSync(expectedPath, actual);
  output(`${ansis.green('Generated:')} ${ansis.cyan(path.relative(rootDir, expectedPath))}`);
}
