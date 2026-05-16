import ansilight from 'ansilight';
import theme from 'ansilight/themes/atom-one-dark';

const code =
`function greet(name) {
  return "Hello, " + name + "!";
}`;

console.log(ansilight(code, {
  lang: 'javascript',
  // use theme background
  theme,
}), '\n');

console.log(ansilight(code, {
  lang: 'javascript',
  background: '#143757', // override theme background
  theme,
}), '\n');

console.log(ansilight(code, {
  lang: 'javascript',
  background: false, // disable background
  theme,
}), '\n');
