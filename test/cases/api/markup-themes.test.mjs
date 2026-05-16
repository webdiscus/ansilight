import path from 'node:path';
import ansis from 'ansis';
import { describe, expect, test } from 'vitest';

// Enable truecolor ANSI output before importing the code that loads ansis.
import '../../env/truecolor.js';
import ansilight from '../../../src/index.js';
import {
  getMarkupFixtures,
  getThemeNames,
  markupDir,
  readTextFile,
  readTheme,
} from '../../helpers.js';

const fixtures = getMarkupFixtures();
const themeNames = getThemeNames();

describe('markup fixtures with generated themes', () => {
  for (const themeName of themeNames) {
    for (const sourcePath of fixtures) {
      const language = path.basename(path.dirname(sourcePath));
      const fixtureName = path.relative(markupDir, sourcePath);

      test(`${themeName} / ${fixtureName}`, async () => {
        const theme = await readTheme(themeName);
        const source = readTextFile(sourcePath);
        const received = ansilight(source, {
          background: false,
          lang: language,
          padding: 0,
          theme,
          width: 'content',
        });
        const plainText = ansis.strip(received);

        expect(plainText).toBe(source);
      });
    }
  }
});
