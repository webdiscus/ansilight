import ansis from 'ansis';

/**
 * Applies the computed theme style for the current nested token style context.
 *
 * Nested token styles need to be computed.
 * Example CSS:
 *   .meta { color: gray; background: black; }
 *   .string { color: blue; }
 *   .meta .string { color: green; font-style: italic; }
 *
 * For `<span class="meta">fn(<span class="string">"value"</span>)</span>`,
 * the style for inner string "value" resolves as:
 *   default + meta + string + meta string
 *
 * So the inner string uses the contextual "meta string" color and italic style,
 * while keeping the visible meta background unless it is explicitly overridden.
 *
 * @param {string} value Text content to render.
 * @param {string[]} stack Current nested token style context.
 * @param {Record<string, object|Function>} theme Normalized theme declarations.
 * @returns {string} Text rendered with ANSI styles.
 */
export function applyStyle(value, stack, theme) {
  const scopeStack = stack.filter(Boolean);
  const style = computeStyle(scopeStack, theme);
  const renderer = createStyleRenderer(style);

  return renderer(value);
}

/**
 * Resolves default, dotted, and contextual theme scopes into one style object.
 *
 * @param {string[]} scopeStack Current nested token scope stack.
 * @param {Record<string, object|Function>} [theme] Theme declarations.
 * @returns {object} Computed style.
 */
export function computeStyle(scopeStack, theme = {}) {
  const computed = {};

  mergeStyle(computed, theme.default);

  for (let index = 0; index < scopeStack.length; index += 1) {
    const scope = scopeStack[index];

    applyScopeChain(computed, scope, theme);

    if (index > 0) {
      const contextScope = scopeStack.slice(0, index + 1).join(' ');
      const style = theme[contextScope];

      mergeStyle(computed, style);
    }
  }

  return computed;
}

/**
 * @param {object} style Computed style.
 * @returns {Function} ANSI renderer function.
 */
export function createStyleRenderer(style) {
  if (typeof style.render === 'function') {
    return style.render;
  }

  let styles = ansis.visible;

  if (style.underline) {
    styles = styles.underline;
  }

  if (style.italic) {
    styles = styles.italic;
  }

  if (style.bold) {
    styles = styles.bold;
  }

  if (style.background) {
    styles = styles.bgHex(style.background);
  }

  if (style.color) {
    styles = styles.hex(style.color);
  }

  return (value) => styles(value);
}

/**
 * Applies each parent part of a dotted scope, for example `title` before `title.function`.
 *
 * @param {object} computed Mutable computed style.
 * @param {string} scope Dotted scope.
 * @param {Record<string, object|Function>} theme Theme declarations.
 * @returns {void}
 */
function applyScopeChain(computed, scope, theme) {
  const parts = scope.split('.');

  for (let size = 1; size <= parts.length; size += 1) {
    const scopePart = parts.slice(0, size).join('.');
    const style = theme[scopePart];

    mergeStyle(computed, style);
  }
}

/**
 * @param {object} computed Mutable computed style.
 * @param {object|Function|undefined} style Theme style declaration.
 * @returns {void}
 */
function mergeStyle(computed, style) {
  if (!style) {
    return;
  }

  if (typeof style === 'function') {
    computed.render = style;
    return;
  }

  Object.assign(computed, style);
}
