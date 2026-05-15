import { describe, expect, test } from 'vitest';
import { htmlToAnsi } from '../../../src/htmlToAnsi.js';
import { normalizePadding } from '../../../src/options.js';

// Test-only renderer map for checking resolved token scopes.
// This is not the public theme object format.
const theme = {
  default: (value) => value,
  keyword: (value) => `[keyword:${value}]`,
  string: (value) => `[string:${value}]`,
  regexp: (value) => `[regexp:${value}]`,
  meta: (value) => `[meta:${value}]`,
  'meta string': (value) => `[meta string:${value}]`,
  'meta function title': (value) => `[meta function title:${value}]`,
  title: (value) => `[title:${value}]`,
  'title.function': (value) => `[title.function:${value}]`,
  punctuation: (value) => `[punctuation:${value}]`,
};

const options = {
  background: null,
  padding: normalizePadding(0),
  theme: { ...theme },
  width: 'content',
};

describe('token scopes', () => {
  test('converts hl.js span classes to themed output', () => {
    const received = htmlToAnsi(
      '<span class="hljs-keyword">const</span> value = <span class="hljs-string">&quot;x&quot;</span>;',
      options
    );
    const expected = '[keyword:const] value = [string:"x"];';

    expect(received).toBe(expected);
  });

  test('normalizes composed hl.js class names and decodes HTML entities', () => {
    const received = htmlToAnsi(
      '<span class="hljs-title function_">hello</span>(&lt;world&gt;)',
      options
    );
    const expected = '[title.function:hello](<world>)';

    expect(received).toBe(expected);
  });

  test('combines nested scopes', () => {
    const received = htmlToAnsi(
      '<span class="hljs-meta">@<span class="hljs-string">&quot;value&quot;</span></span>',
      options
    );
    const expected = '[meta:@][meta string:"value"]';

    expect(received).toBe(expected);
  });

  test('combines deeper nested scopes', () => {
    const received = htmlToAnsi(
      '<span class="hljs-meta"><span class="hljs-function"><span class="hljs-title">run</span></span></span>',
      options
    );
    const expected = '[meta function title:run]';

    expect(received).toBe(expected);
  });

  test('restores parent scope after closing nested spans', () => {
    const received = htmlToAnsi(
      '<span class="hljs-meta">@<span class="hljs-string">&quot;x&quot;</span> suffix</span>',
      options
    );
    const expected = '[meta:@][meta string:"x"][meta: suffix]';

    expect(received).toBe(expected);
  });

  test('restores default scope after closing sibling spans', () => {
    const received = htmlToAnsi(
      '<span class="hljs-keyword">const</span> plain <span class="hljs-string">&quot;x&quot;</span> tail',
      options
    );
    const expected = '[keyword:const] plain [string:"x"] tail';

    expect(received).toBe(expected);
  });

  test('falls back from specific sub-scopes to parent scopes', () => {
    const received = htmlToAnsi(
      '<span class="hljs-title class_ inherited__">BaseModel</span>',
      options
    );
    const expected = '[title:BaseModel]';

    expect(received).toBe(expected);
  });

  test('renders unknown scopes as default text', () => {
    const received = htmlToAnsi(
      '<span class="hljs-unknown">value</span>',
      options
    );
    const expected = 'value';

    expect(received).toBe(expected);
  });

  test('ignores non-span HTML tags', () => {
    const received = htmlToAnsi(
      '<span class="hljs-keyword">return</span> <em>value</em><br>',
      options
    );
    const expected = '[keyword:return] value';

    expect(received).toBe(expected);
  });
});
