import hljs from 'highlight.js';
import { htmlToAnsi } from './htmlToAnsi.js';
import { normalizeOptions } from './options.js';

/**
 * @param {unknown} code Source code to highlight.
 * @param {object} [options] Highlighting and terminal output options.
 * @returns {string} Highlighted ANSI output.
 */
export function ansilight(code, options = {}) {
  const source = String(code);
  const normalizedOptions = normalizeOptions(options);
  const language = options.lang || options.language;

  let result;

  if (language && hljs.getLanguage(language)) {
    result = hljs.highlight(source, {
      language,
      ignoreIllegals: options.ignoreIllegals !== false,
    });
  } else {
    result = hljs.highlightAuto(source);
  }

  return htmlToAnsi(result.value, normalizedOptions);
}
