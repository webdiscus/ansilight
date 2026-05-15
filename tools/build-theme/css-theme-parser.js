import { createRequire } from 'node:module';
import { selectorToScope } from '../utils.js';

const require = createRequire(import.meta.url);
const cssColorNames = require('css-color-names');

/**
 * Converts a highlight.js CSS theme to an ANSI theme object.
 *
 * It supports HEX colors, named colors, bold, italic, underline,
 * simple CSS variables, and image background fallback colors.
 *
 * @param {string} css CSS theme source.
 * @param {{name?: string, sourceDir?: string}} [options] Theme metadata.
 * @returns {{theme: object, warnings: object[], imageBackgrounds: object[], cssVariables: object[], stats: object, name: string|undefined}} Parsed theme data.
 */
export function parseCssTheme(css, options = {}) {
  const theme = {};
  const warnings = [];
  const imageBackgrounds = [];
  const cssVariables = [];
  const stats = {
    rules: 0,
    appliedRules: 0,
    declarations: 0,
  };
  const source = stripComments(String(css));
  const variables = collectRootVariables(source);
  const ruleRe = /([^{}]+)\{([^{}]*)\}/g;

  for (const match of source.matchAll(ruleRe)) {
    const selectors = splitSelectors(match[1]);
    const context = {
      warnings,
      selectors,
      imageBackgrounds,
      cssVariables,
      variables,
    };
    const declarations = parseDeclarations(match[2], context, options);

    stats.rules += 1;

    if (Object.keys(declarations).length === 0) {
      continue;
    }

    for (const selector of selectors) {
      const scope = selectorToScope(selector);

      if (!scope) {
        warnings.push({
          type: 'unsupported-selector',
          selector,
          message: `Unsupported selector: ${selector}`,
        });
        continue;
      }

      theme[scope] = {
        ...theme[scope],
        ...declarations,
      };
      stats.appliedRules += 1;
      stats.declarations += Object.keys(declarations).length;
    }
  }

  return {
    theme,
    warnings,
    imageBackgrounds,
    cssVariables,
    stats,
    name: options.name,
  };
}

/**
 * Collects selectors used by a CSS theme.
 *
 * @param {string} css CSS theme source.
 * @returns {string[]} CSS selectors.
 */
export function collectCssSelectors(css) {
  const selectors = [];
  const source = stripComments(String(css));
  const ruleRe = /([^{}]+)\{([^{}]*)\}/g;

  for (const match of source.matchAll(ruleRe)) {
    if (isRootVariablesOnlyRule(match[1], match[2])) {
      continue;
    }

    const ruleSelectors = splitSelectors(match[1]);

    selectors.push(...ruleSelectors);
  }

  return selectors;
}

/**
 * Parses CSS declarations supported by ANSI themes.
 *
 * @param {string} block CSS declaration block.
 * @param {object} context Parse state for this rule.
 * @param {object[]} context.warnings Warning list.
 * @param {string[]} context.selectors Selectors for this declaration.
 * @param {object[]} context.imageBackgrounds Image background report.
 * @param {object[]} context.cssVariables CSS variable report.
 * @param {Record<string, string>} context.variables CSS variables by name.
 * @param {{name?: string, sourceDir?: string}} options Theme metadata.
 * @returns {object} Supported ANSI style declarations.
 */
function parseDeclarations(block, context, options) {
  const declarations = {};
  const { warnings, selectors } = context;

  for (const rawDeclaration of block.split(';')) {
    const index = rawDeclaration.indexOf(':');

    if (index < 0) {
      continue;
    }

    const property = rawDeclaration.slice(0, index).trim().toLowerCase();
    const rawValue = rawDeclaration.slice(index + 1).trim();
    const resolvedValue = resolveCssVariable(rawValue, property, context, options);

    if (!resolvedValue.supported) {
      continue;
    }

    const value = resolvedValue.value;

    if (property === 'color') {
      const color = parseHexColor(value);

      if (color) {
        declarations.color = color;
      } else if (isAlphaHex(value)) {
        warn({ warnings, type: 'unsupported-alpha-color', selectors, property, value });
      } else {
        warn({ warnings, type: 'unsupported-color', selectors, property, value });
      }

      continue;
    }

    if (property === 'font-weight') {
      if (value === 'bold' || Number(value) >= 600) {
        declarations.bold = true;
      } else {
        warn({ warnings, type: 'unsupported-font-weight', selectors, property, value });
      }

      continue;
    }

    if (property === 'font-style') {
      if (value === 'italic') {
        declarations.italic = true;
      } else {
        warn({ warnings, type: 'unsupported-font-style', selectors, property, value });
      }

      continue;
    }

    if (property === 'text-decoration') {
      if (/\bunderline\b/.test(value)) {
        declarations.underline = true;
      } else {
        warn({ warnings, type: 'unsupported-text-decoration', selectors, property, value });
      }

      continue;
    }

    if (property === 'background' || property === 'background-color') {
      const background = parseHexColor(value);
      const imageBackground = parseImageBackground(value, options);

      if (background) {
        declarations.background = background;
      } else if (imageBackground && imageBackground.fallbackBackground) {
        declarations.background = imageBackground.fallbackBackground;
        collectImageBackgrounds({
          imageBackgrounds: context.imageBackgrounds,
          selectors,
          property,
          value,
          imageBackground,
        }, options);
        warn({ warnings, type: 'unsupported-background', selectors, property, value });
      } else if (isAlphaHex(value)) {
        warn({ warnings, type: 'unsupported-alpha-background', selectors, property, value });
      } else {
        if (imageBackground) {
          collectImageBackgrounds({
            imageBackgrounds: context.imageBackgrounds,
            selectors,
            property,
            value,
            imageBackground,
          }, options);
        }

        warn({ warnings, type: 'unsupported-background', selectors, property, value });
      }
    }
  }

  return declarations;
}

/**
 * @param {object} context Image background report data.
 * @param {object[]} context.imageBackgrounds Image background report.
 * @param {string[]} context.selectors Selectors for this declaration.
 * @param {string} context.property CSS property name.
 * @param {string} context.value CSS property value.
 * @param {object} context.imageBackground Parsed image background.
 * @param {{name?: string}} options Theme metadata.
 * @returns {void}
 */
function collectImageBackgrounds(context, options) {
  const { imageBackgrounds, selectors, property, value, imageBackground } = context;

  for (const selector of selectors) {
    imageBackgrounds.push({
      theme: options.name || 'unknown',
      selector,
      property,
      value,
      image: imageBackground.image,
      fallbackBackground: imageBackground.fallbackBackground,
    });
  }
}

/**
 * Reads url(...) and a HEX fallback color from a background value.
 *
 * If the fallback color exists, it can be used as ANSI background.
 *
 * @param {string} value CSS background value.
 * @param {{sourceDir?: string}} options Theme metadata.
 * @returns {{image: string, fallbackBackground: string|null}|null} Parsed image background.
 */
function parseImageBackground(value, options) {
  const image = parseBackgroundImage(value);

  if (!image) {
    return null;
  }

  return {
    image: resolveBackgroundImage(options.sourceDir, image),
    fallbackBackground: parseBackgroundFallbackColor(value),
  };
}

/**
 * @param {string} value CSS background value.
 * @returns {string|null} URL from url(...), or null.
 */
function parseBackgroundImage(value) {
  const match = value.match(/\burl\(\s*(['"]?)(.*?)\1\s*\)/i);

  return match ? match[2] : null;
}

/**
 * @param {string} value CSS background value.
 * @returns {string|null} Fallback HEX color found in value.
 */
function parseBackgroundFallbackColor(value) {
  const match = value.match(/#(?:[0-9a-f]{3}|[0-9a-f]{6})\b/i);

  return match ? match[0] : null;
}

/**
 * @param {string|undefined} sourceDir Directory of source CSS theme.
 * @param {string} image Image URL from CSS.
 * @returns {string} Resolved image path for reports.
 */
function resolveBackgroundImage(sourceDir, image) {
  if (/^(?:[a-z]+:|data:)/i.test(image)) {
    return image;
  }

  if (!sourceDir) {
    return image;
  }

  return `${sourceDir}/${image.replace(/^\.\//, '')}`;
}

/**
 * Collects CSS custom properties from :root blocks.
 *
 * :root is not converted to a theme scope. It is only used as a source
 * for var(--name) values.
 *
 * @param {string} css CSS theme source without comments.
 * @returns {Record<string, string>} CSS variables by name.
 */
function collectRootVariables(css) {
  const variables = {};
  const ruleRe = /([^{}]+)\{([^{}]*)\}/g;

  for (const match of css.matchAll(ruleRe)) {
    const selectors = splitSelectors(match[1]);

    if (!selectors.includes(':root')) {
      continue;
    }

    for (const declaration of parseDeclarationPairs(match[2])) {
      if (declaration.property.startsWith('--')) {
        variables[declaration.property] = declaration.value;
      }
    }
  }

  return variables;
}

/**
 * Resolves simple var(--name) values.
 *
 * Missing variables and var fallback syntax are not applied. They are
 * reported for manual review.
 *
 * @param {string} value CSS value.
 * @param {string} property CSS property name.
 * @param {object} context Parse state for this rule.
 * @param {object[]} context.warnings Warning list.
 * @param {string[]} context.selectors Selectors for this declaration.
 * @param {object[]} context.cssVariables CSS variable report.
 * @param {Record<string, string>} context.variables CSS variables by name.
 * @param {{name?: string}} options Theme metadata.
 * @returns {{supported: boolean, value: string}} Resolved value result.
 */
function resolveCssVariable(value, property, context, options) {
  const { warnings, selectors, cssVariables, variables } = context;
  const variable = parseCssVariable(value);

  if (!variable) {
    return {
      supported: true,
      value,
    };
  }

  if (variable.fallback) {
    warnCssVariable({
      warnings,
      cssVariables,
      selectors,
      property,
      value,
      variable: variable.name,
      fallback: variable.fallback,
      reason: 'var fallback syntax is not supported',
    }, options);

    return {
      supported: false,
      value,
    };
  }

  if (!Object.hasOwn(variables, variable.name)) {
    warnCssVariable({
      warnings,
      cssVariables,
      selectors,
      property,
      value,
      variable: variable.name,
      fallback: null,
      reason: 'missing variable',
    }, options);

    return {
      supported: false,
      value,
    };
  }

  return {
    supported: true,
    value: variables[variable.name],
  };
}

/**
 * @param {string} value CSS value.
 * @returns {{name: string, fallback: string|null}|null} Parsed CSS variable call.
 */
function parseCssVariable(value) {
  const match = value.match(/^var\(\s*(--[A-Za-z0-9_-]+)\s*(?:,\s*(.+))?\)$/);

  if (!match) {
    return null;
  }

  return {
    name: match[1],
    fallback: match[2] || null,
  };
}

/**
 * @param {string} block CSS declaration block.
 * @returns {{property: string, value: string}[]} CSS declaration pairs.
 */
function parseDeclarationPairs(block) {
  const declarations = [];

  for (const rawDeclaration of block.split(';')) {
    const index = rawDeclaration.indexOf(':');

    if (index < 0) {
      continue;
    }

    declarations.push({
      property: rawDeclaration.slice(0, index).trim().toLowerCase(),
      value: rawDeclaration.slice(index + 1).trim(),
    });
  }

  return declarations;
}

/**
 * @param {string} value CSS color value.
 * @returns {string|null} HEX or named color as HEX.
 */
function parseHexColor(value) {
  const match = value.match(/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i);

  if (match) {
    return match[0];
  }

  return cssColorNames[value.toLowerCase()] || null;
}

/**
 * @param {string} value CSS color value.
 * @returns {boolean} True when value is HEX with alpha.
 */
function isAlphaHex(value) {
  return /^#(?:[0-9a-f]{4}|[0-9a-f]{8})$/i.test(value);
}

/**
 * @param {string} rawSelectors Raw selector list.
 * @param {string} block CSS declaration block.
 * @returns {boolean} True when the rule only defines :root variables.
 */
function isRootVariablesOnlyRule(rawSelectors, block) {
  const selectors = splitSelectors(rawSelectors);

  if (!selectors.includes(':root')) {
    return false;
  }

  const declarations = parseDeclarationPairs(block);

  return declarations.length > 0 && declarations.every((declaration) => declaration.property.startsWith('--'));
}

/**
 * @param {string} value Raw selector list.
 * @returns {string[]} Normalized selectors.
 */
function splitSelectors(value) {
  return value.split(',').map(normalizeCssSelector).filter(Boolean);
}

/**
 * @param {string} selector Raw CSS selector.
 * @returns {string} One-line selector.
 */
function normalizeCssSelector(selector) {
  return selector.trim().replace(/\s+/g, ' ');
}

export { selectorToScope };

/**
 * @param {string} css CSS source.
 * @returns {string} CSS without comments.
 */
function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

/**
 * @param {object} context Warning data.
 * @param {object[]} context.warnings Warning list.
 * @param {string} context.type Warning type.
 * @param {string[]} context.selectors Selectors for this declaration.
 * @param {string} context.property CSS property name.
 * @param {string} context.value CSS property value.
 * @returns {void}
 */
function warn(context) {
  const { warnings, type, selectors, property, value } = context;

  warnings.push({
    type,
    selectors,
    property,
    value,
    message: `${type}: ${selectors.join(', ')} { ${property}: ${value} }`,
  });
}

/**
 * @param {object} context CSS variable warning data.
 * @param {object[]} context.warnings Warning list.
 * @param {object[]} context.cssVariables CSS variable report.
 * @param {string[]} context.selectors Selectors for this declaration.
 * @param {string} context.property CSS property name.
 * @param {string} context.value CSS value.
 * @param {string} context.variable CSS variable name.
 * @param {string|null} context.fallback CSS variable fallback value.
 * @param {string} context.reason Warning reason.
 * @param {{name?: string}} options Theme metadata.
 * @returns {void}
 */
function warnCssVariable(context, options) {
  const { warnings, cssVariables, selectors, property, value, variable, fallback, reason } = context;

  for (const selector of selectors) {
    cssVariables.push({
      theme: options.name || 'unknown',
      selector,
      property,
      value,
      variable,
      fallback,
      reason,
    });
  }

  warnings.push({
    type: 'unsupported-css-variable',
    selectors,
    property,
    value,
    variable,
    fallback,
    reason,
    message: `unsupported-css-variable: ${selectors.join(', ')} { ${property}: ${value} } (${reason})`,
  });
}
