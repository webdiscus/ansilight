import ansilight from 'ansilight';
import theme from 'ansilight/themes/atom-one-dark';

const code =
`type User = {
  id: number;
  name: string;
};`;

console.log(ansilight(code, {
  language: 'typescript',
  // use content width
  theme,
}), '\n');

console.log(ansilight(code, {
  language: 'typescript',
  width: 40, // set minimum background width
  theme,
}), '\n');
