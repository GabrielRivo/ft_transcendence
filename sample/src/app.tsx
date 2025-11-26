import { render, createElement } from 'my-react';
import App from './main';

const root = document.getElementById('root');
if (root) {
  render(<App />, root as HTMLElement);
} else {
  console.error('Element root not found!');
}