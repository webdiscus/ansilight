import ansilight, {
  type AnsilightOptions,
  type Theme,
  type ThemeRule,
} from 'ansilight';
import github from 'ansilight/themes/github';

const rule: ThemeRule = {
  background: '#000000',
  bold: true,
  color: '#ffffff',
  italic: true,
  underline: true,
};
const theme: Theme = {
  default: rule,
  keyword: {
    color: '#ff0000',
  },
};
const options: AnsilightOptions = {
  background: null,
  ignoreIllegals: false,
  lang: 'javascript',
  padding: '0 1',
  theme,
  width: 'content',
};

const output: string = ansilight('const value = "Hello World!";', options);
const themedOutput: string = ansilight('const value = "Hello World!";', {
  background: false,
  theme: github,
  width: 80,
});

output.toUpperCase();
themedOutput.toUpperCase();

ansilight('const value = 1;', {
  background: '#143757',
  padding: 2,
});

ansilight('const value = 1;', {
  // @ts-expect-error Invalid width option.
  width: 'terminal',
});

ansilight('const value = 1;', {
  // @ts-expect-error Invalid background option.
  background: true,
});

ansilight('const value = 1;', {
  // @ts-expect-error Use public `lang` option instead.
  language: 'javascript',
});
