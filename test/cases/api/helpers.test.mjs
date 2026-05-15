import { afterEach, describe, expect, test, vi } from 'vitest';
import { output } from '../../../tools/output.js';

describe('helpers', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('output', () => {
    test('writes value with newline', () => {
      const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

      output('hello');

      const received = write.mock.calls;
      const expected = [
        ['hello\n'],
      ];

      expect(received).toEqual(expected);
    });

    test('writes empty line by default', () => {
      const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

      output();

      const received = write.mock.calls;
      const expected = [
        ['\n'],
      ];

      expect(received).toEqual(expected);
    });
  });
});
