/**
 * Truecolor syntax highlighting in the terminal with 256 highlight.js themes.
 *
 * @packageDocumentation
 */

/**
 * Styling for a single highlight.js style scope.
 *
 * Field names mirror the CSS properties they were converted from,
 * which keeps theme objects close to the original highlight.js CSS themes.
 */
export interface ThemeRule {
    /** Foreground color (HEX, e.g. `"#f8f8f8"`). */
    color?: string;
    /** Background color (HEX, e.g. `"#000"`). */
    background?: string;
    /** Render in bold. */
    bold?: boolean;
    /** Render in italic. */
    italic?: boolean;
    /** Render with underline. */
    underline?: boolean;
}

/**
 * A theme object that maps highlight.js style scopes to ANSI styling.
 *
 * Keys are scope selectors from highlight.js. They can be:
 * - simple (`"keyword"`, `"string"`, `"comment"`)
 * - compound with a dot (`"title.class"`)
 * - nested with a space (`"class title"`)
 * - hyphenated (`"selector-class"`, `"template-variable"`)
 *
 * The special key `"default"` defines the block's base foreground
 * and background, applied as a fallback for tokens without a more
 * specific rule.
 *
 * @see {@link https://highlightjs.readthedocs.io/en/latest/css-classes-reference.html#stylable-scopes | highlight.js stylable scopes}
 *
 * @example
 * ```ts
 * const theme: Theme = {
 *   default: { background: "#000", color: "#f8f8f8" },
 *   keyword: { color: "#e28964" },
 *   string:  { color: "#65b042" },
 *   comment: { color: "#aeaeae", italic: true },
 *   "title.class": { underline: true },
 * };
 * ```
 */
export type Theme = Record<string, ThemeRule>;

/**
 * Options accepted by {@link ansilight}.
 */
export interface AnsilightOptions {
    /**
     * Language name (any language supported by highlight.js).
     * If omitted, the language is auto-detected from the input.
     *
     * @default auto-detect
     */
    language?: string;

    /**
     * Pass-through to highlight.js. When `true`, illegal syntax in
     * the input is ignored instead of throwing.
     *
     * @default true
     */
    ignoreIllegals?: boolean;

    /**
     * Theme object to apply. If omitted, the bundled `"default"`
     * theme is used.
     */
    theme?: Theme;

    /**
     * Background color for the output block.
     *
     * - HEX string (e.g. `"#143757"`): override the theme's background.
     * - `false`: disable the background entirely.
     * - Omitted: use the theme's background.
     */
    background?: string | false | null;

    /**
     * Padding inside the background block, using a CSS-like shorthand.
     *
     * - Number: same padding on all sides.
     * - String with 1, 2, 3, or 4 space-separated numbers
     *   (e.g. `"1 4"`): CSS-like shorthand.
     *
     * @default `0`, or `"0 1"` when a background is enabled
     */
    padding?: number | string;

    /**
     * Visible block width in terminal columns (cells), excluding padding.
     *
     * - Number: minimum width. The block expands if the content is wider.
     * - `"content"`: width fits the longest line of highlighted code.
     *
     * @default "content"
     */
    width?: number | "content";
}

/**
 * Highlights source code and returns a string with ANSI escape sequences
 * ready to be printed to a terminal.
 *
 * @param code Source code to highlight.
 * @param options Highlighting and output options.
 * @returns The highlighted code as a string with embedded ANSI escapes.
 */
declare function ansilight(
    code: string,
    options?: AnsilightOptions,
): string;

export default ansilight;
