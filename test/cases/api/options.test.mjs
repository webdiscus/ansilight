import { describe, expect, test } from 'vitest';
import ansis from 'ansis';
import ansilight from '../../../src/index.js';
import { applyBackground, visibleLength } from '../../../src/background.js';
import { normalizeBackground, normalizeOptions, normalizePadding, normalizeWidth } from '../../../src/options.js';

describe('options', () => {
  describe('background', () => {
    test('applies block background by default', () => {
      const result = ansilight('const x = 1;\nx;', {
        lang: 'javascript',
        theme: {
          default: { background: '#ffffff' },
        },
      });
      const lines = ansis.strip(result).split('\n');
      const received = {
        sameWidth: lines[0].length === lines[1].length,
        firstLineHasPadding: lines[0].startsWith(' '),
        secondLineHasPadding: lines[1].startsWith(' '),
      };
      const expected = {
        sameWidth: true,
        firstLineHasPadding: true,
        secondLineHasPadding: true,
      };

      expect(received).toEqual(expected);
    });

    test('can disable block background', () => {
      const result = ansilight('const x = 1;\nx;', {
        background: false,
        lang: 'javascript',
        theme: {
          default: { background: '#ffffff' },
        },
      });
      const lines = ansis.strip(result).split('\n');
      const received = lines[0].length > lines[1].length;
      const expected = true;

      expect(received).toBe(expected);
    });

    test('does not render background ANSI codes when background is disabled', () => {
      const result = ansilight('const x = 1;', {
        background: false,
        lang: 'javascript',
        theme: {
          default: { background: '#ffffff' },
        },
      });
      const received = /\u001B\[(?:48|49)(?:;|m)/.test(result);
      const expected = false;

      expect(received).toBe(expected);
    });

    test('uses explicit background color', () => {
      const received = normalizeBackground('#123456', {
        default: { background: '#ffffff' },
      });
      const expected = '#123456';

      expect(received).toBe(expected);
    });

    test('explicit background overrides theme default background', () => {
      const result = ansilight('const x = 1;', {
        background: '#143757',
        lang: 'javascript',
        theme: {
          default: {
            background: '#ffffff',
            color: '#444444',
          },
        },
      });
      const received = {
        hasExplicitBackground: result.includes('\u001B[48;2;20;55;87m'),
        hasThemeBackground: result.includes('\u001B[48;2;255;255;255m'),
      };
      const expected = {
        hasExplicitBackground: true,
        hasThemeBackground: false,
      };

      expect(received).toEqual(expected);
    });
  });

  describe('width', () => {
    test('counts visible length without ANSI escape codes', () => {
      const received = visibleLength(ansis.red('abc'));
      const expected = 3;

      expect(received).toBe(expected);
    });

    test('uses content width', () => {
      const block = applyBackground(`${ansis.red('a')}\nabc`, {
        background: '#ffffff',
        padding: normalizePadding(0),
        width: 'content',
      });
      const received = ansis.strip(block).split('\n');
      const expected = [
        'a  ',
        'abc',
      ];

      expect(received).toEqual(expected);
    });

    test('uses numeric width as minimum width', () => {
      const block = applyBackground('ab\nc', {
        background: '#ffffff',
        padding: normalizePadding(0),
        width: 4,
      });
      const received = ansis.strip(block).split('\n');
      const expected = [
        'ab  ',
        'c   ',
      ];

      expect(received).toEqual(expected);
    });

    test('normalizes positive numeric width', () => {
      const received = normalizeWidth(10);
      const expected = 10;

      expect(received).toBe(expected);
    });

    test('expands numeric width when content is wider', () => {
      const block = applyBackground('ab\nabcdef', {
        background: '#ffffff',
        padding: normalizePadding(0),
        width: 4,
      });
      const received = ansis.strip(block).split('\n');
      const expected = [
        'ab    ',
        'abcdef',
      ];

      expect(received).toEqual(expected);
    });

    test('throws for invalid string width', () => {
      const received = () => normalizeWidth('terminal');
      const expected = /Invalid width option: terminal/;

      expect(received).toThrow(expected);
    });

    test('throws for non-positive numeric width', () => {
      const received = () => normalizeWidth(0);
      const expected = /Invalid width option: 0/;

      expect(received).toThrow(expected);
    });

    test('throws for NaN width', () => {
      const received = () => normalizeWidth(Number.NaN);
      const expected = /Invalid width option: NaN/;

      expect(received).toThrow(expected);
    });
  });

  describe('padding', () => {
    test('parses CSS-like shorthand', () => {
      const received = [
        normalizePadding(5),
        normalizePadding('2,5'),
        normalizePadding('1 2 3'),
        normalizePadding('1 2 3 4'),
      ];
      const expected = [
        { top: 5, right: 5, bottom: 5, left: 5 },
        { top: 2, right: 5, bottom: 2, left: 5 },
        { top: 1, right: 2, bottom: 3, left: 2 },
        { top: 1, right: 2, bottom: 3, left: 4 },
      ];

      expect(received).toEqual(expected);
    });

    test('applies vertical and horizontal padding', () => {
      const block = applyBackground('ab', {
        background: '#ffffff',
        padding: normalizePadding('1 2'),
        width: 'content',
      });
      const received = ansis.strip(block).split('\n');
      const expected = [
        '      ',
        '  ab  ',
        '      ',
      ];

      expect(received).toEqual(expected);
    });

    test('can override default block background padding', () => {
      const highlightedCode = ansilight('const x = 1;\nx;', {
        lang: 'javascript',
        padding: 0,
        theme: {
          default: { background: '#ffffff' },
        },
      });
      const firstLine = ansis.strip(highlightedCode).split('\n')[0];
      const received = firstLine.startsWith(' ');
      const expected = false;

      expect(received).toBe(expected);
    });

    test('uses default background padding when background exists', () => {
      const options = normalizeOptions({
        theme: {
          default: { background: '#ffffff' },
        },
      });
      const received = options.padding;
      const expected = { top: 0, right: 1, bottom: 0, left: 1 };

      expect(received).toEqual(expected);
    });
  });

  describe('lang', () => {
    test('uses explicit language from lang option', () => {
      const received = ansilight('SELECT 1;', {
        background: false,
        lang: 'sql',
        padding: 0,
        width: 'content',
      });
      const expected = true;

      expect(received.includes('\u001B[')).toBe(expected);
    });

    test('keeps language option as silent alias', () => {
      const received = ansilight('SELECT 1;', {
        background: false,
        language: 'sql',
        padding: 0,
        width: 'content',
      });
      const expected = ansilight('SELECT 1;', {
        background: false,
        lang: 'sql',
        padding: 0,
        width: 'content',
      });

      expect(received).toBe(expected);
    });
  });
});
