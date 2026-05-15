import { describe, expect, test } from 'vitest';

// Enable truecolor ANSI output before importing the code that loads ansis.
import '../../env/truecolor.js';
import { htmlToAnsi } from '../../../src/htmlToAnsi.js';
import { normalizeOptions } from '../../../src/options.js';

describe('theme', () => {
  test('uses provided theme as replacement', () => {
    const theme = {
      default: { render: (value) => `[default:${value}]` },
      keyword: { render: (value) => `[keyword:${value}]` },
    };
    const options = normalizeOptions({
      background: false,
      theme,
    });
    const received = htmlToAnsi(
      '<span class="hljs-keyword">const</span> <span class="hljs-title">value</span>',
      options
    );
    const expected = '[keyword:const][default: ][default:value]';

    expect(received).toBe(expected);
  });

  test('renders plain text when custom theme has no default style', () => {
    const theme = {
      keyword: { render: (value) => `[keyword:${value}]` },
    };
    const options = normalizeOptions({
      background: false,
      theme,
    });
    const received = htmlToAnsi(
      'plain <span class="hljs-title">value</span>',
      options
    );
    const expected = 'plain value';

    expect(received).toBe(expected);
  });
});
