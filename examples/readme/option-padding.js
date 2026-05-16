import ansilight from 'ansilight';
import theme from 'ansilight/themes/atom-one-dark';

const code =
`type User = {
  id: number;
  name: string;
};`;

console.log(ansilight(code, {
  lang: 'typescript',
  // default padding
  theme,
}), '\n');

console.log(ansilight(code, {
  lang: 'typescript',
  padding: 1, // same padding on all sides
  theme,
}), '\n');

console.log(ansilight(code, {
  lang: 'typescript',
  padding: '1 4', // vertical and horizontal padding
  theme,
}), '\n');
