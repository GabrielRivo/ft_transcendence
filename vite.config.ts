import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
	root: 'src',
	publicDir: '../public',
	build: {
		outDir: '../dist',
		emptyOutDir: true,
	},
	esbuild: {
		jsx: 'transform',
		jsxFactory: 'createElement',
		jsxFragment: 'FragmentComponent',
	},
	plugins: [tailwindcss()],
	server: {
		port: 5173,
		host: true,
	},
});
