import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { findSourceFiles } from '../tools/utils.js';

export const markupDir = path.resolve('test/markup');
export const themesDir = path.resolve('themes');

export function getMarkupFixtures() {
  return findSourceFiles(markupDir);
}

export function readTextFile(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

export function readHighlightJsThemeCss(name) {
  const stylesDir = path.resolve('node_modules/highlight.js/styles');

  return readTextFile(path.join(stylesDir, `${name}.css`));
}

export async function readTheme(name) {
  const themePath = path.join(themesDir, `${name}.js`);
  const themeUrl = pathToFileURL(themePath).href;
  const themeModule = await import(themeUrl);

  return themeModule.default;
}

export function getThemeNames() {
  return fs.readdirSync(themesDir)
    .filter((fileName) => fileName.endsWith('.js'))
    .map((fileName) => fileName.replace(/\.js$/, ''))
    .sort();
}
