import defaultTheme from '../themes/default.js';

export const DEFAULT_THEME = { ...defaultTheme };

/**
 * @param {object} [options] User options.
 * @returns {object} Normalized options.
 */
export function normalizeOptions(options = {}) {
  const theme = { ...(options.theme || DEFAULT_THEME) };
  const background = normalizeBackground(options.background, theme);
  const outputTheme = normalizeThemeBackground(theme, background);
  const paddingValue = options.padding == null && background ? '0 1' : options.padding;
  const padding = normalizePadding(paddingValue);
  const width = normalizeWidth(options.width);

  return {
    background,
    padding,
    theme: outputTheme,
    width,
  };
}

/**
 * Parses CSS-like padding shorthand.
 *
 * @param {number|string} [value] Padding shorthand value.
 * @returns {{top: number, right: number, bottom: number, left: number}} Normalized padding.
 */
export function normalizePadding(value = 0) {
  const values = String(value)
    .trim()
    .split(/[,\s]+/)
    .filter(Boolean)
    .slice(0, 4)
    .map(Number);

  const [top, right = top, bottom = top, left = right] = values;

  return {
    top,
    right,
    bottom,
    left,
  };
}

/**
 * @param {number|string} [value] Width option.
 * @returns {number|string} Normalized width.
 */
export function normalizeWidth(value = 'content') {
  if (value === 'content') {
    return value;
  }

  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return value;
  }

  throw new TypeError(`Invalid width option: ${String(value)}. Expected "content" or a positive number.`);
}

/**
 * @param {string|false|null|undefined} value Background option value.
 * @param {object} theme Theme object.
 * @returns {string|null} Normalized background color.
 */
export function normalizeBackground(value, theme) {
  if (value === false || value === null) {
    return null;
  }

  if (typeof value === 'string') {
    return value;
  }

  return theme.default && theme.default.background || null;
}

/**
 * Applies the background option to the default theme style.
 *
 * @param {object} theme Theme object.
 * @param {string|null} background Normalized background color.
 * @returns {object} Theme object with resolved default background.
 */
function normalizeThemeBackground(theme, background) {
  if (background) {
    return {
      ...theme,
      default: {
        ...theme.default,
        background,
      },
    };
  }

  if (!theme.default?.background) {
    return theme;
  }

  const defaultStyle = { ...theme.default };

  delete defaultStyle.background;

  return {
    ...theme,
    default: defaultStyle,
  };
}
