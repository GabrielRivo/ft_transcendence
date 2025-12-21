import { render, createElement } from 'my-react';
import App from './router';

const root = document.getElementById('root');
if (root) {
  render(<App />, root as HTMLElement);
} else {
  console.error('Element root not found!');
}