import path from 'node:path';
import { describe, expect, test } from 'vitest';

// Enable truecolor ANSI output before importing the code that loads ansis.
import '../../env/truecolor.js';
import ansilight from '../../../src/index.js';
import { DEFAULT_THEME } from '../../../src/options.js';
import { getMarkupFixtures, markupDir, readTextFile } from '../../helpers.js';

describe('markup fixtures', () => {
  for (const sourcePath of getMarkupFixtures()) {
    const language = path.basename(path.dirname(sourcePath));
    const fixtureName = path.relative(markupDir, sourcePath);

    test(fixtureName, () => {
      const source = readTextFile(sourcePath);
      const expectedPath = sourcePath.replace(/\.txt$/, '.expect.txt');
      const expected = readTextFile(expectedPath);
      const received = ansilight(source, {
        background: false,
        lang: language,
        padding: 0,
        theme: DEFAULT_THEME,
        width: 'content',
      });

      expect(received).toBe(expected);
    });
  }
});
