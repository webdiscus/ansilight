import ansis from 'ansis';

/**
 * Applies a block background around already-rendered ANSI text.
 *
 * @param {string} value ANSI text.
 * @param {object} [options] Normalized terminal output options.
 * @returns {string} ANSI text with block background.
 */
export function applyBackground(value, options = {}) {
  const background = options.background;

  if (!background) {
    return value;
  }

  const lines = value.split('\n');
  const padding = options.padding;
  const width = getWidth(lines, options.width) + padding.left + padding.right;
  const emptyLine = ansis.bgHex(background)(' '.repeat(width));
  const output = [];

  for (let index = 0; index < padding.top; index += 1) {
    output.push(emptyLine);
  }

  for (const line of lines) {
    const leftPadding = ' '.repeat(padding.left);
    const paddedLine = `${leftPadding}${line}`;
    const rightPaddingSize = Math.max(0, width - visibleLength(paddedLine));
    const rightPadding = ' '.repeat(rightPaddingSize);
    const renderedLine = ansis.bgHex(background)(`${paddedLine}${rightPadding}`);

    output.push(renderedLine);
  }

  for (let index = 0; index < padding.bottom; index += 1) {
    output.push(emptyLine);
  }

  return output.join('\n');
}

/**
 * @param {string[]} lines ANSI text lines.
 * @param {number|string} width Width option.
 * @returns {number} Visible block content width.
 */
export function getWidth(lines, width) {
  const contentWidth = getContentWidth(lines);

  if (width === 'content') {
    return contentWidth;
  }

  return Math.max(width, contentWidth);
}

/**
 * @param {string[]} lines ANSI text lines.
 * @returns {number} Maximum visible line width.
 */
function getContentWidth(lines) {
  return lines.reduce((width, line) => {
    const lineWidth = visibleLength(line);

    return Math.max(width, lineWidth);
  }, 0);
}

/**
 * @param {string} value ANSI text.
 * @returns {number} Visible text length without ANSI escape codes.
 */
export function visibleLength(value) {
  return ansis.strip(value).length;
}
