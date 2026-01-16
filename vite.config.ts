import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
	root: 'src',
	publicDir: '../public',
	build: {
		outDir: '../dist',
		emptyOutDir: true,
	},
	resolve: {
		alias: {
			'@': path.resolve(__dirname, './src'),
			'@components': path.resolve(__dirname, './src/components'),
			'@context': path.resolve(__dirname, './src/context'),
			'@dto': path.resolve(__dirname, './src/dto'),
			'@hook': path.resolve(__dirname, './src/hook'),
			'@layout': path.resolve(__dirname, './src/layout'),
			'@libs': path.resolve(__dirname, './src/libs'),
			'@pages': path.resolve(__dirname, './src/pages'),
			'@form': path.resolve(__dirname, './src/components/form'),
			'@guards': path.resolve(__dirname, './src/components/guards'),
			'@section': path.resolve(__dirname, './src/components/section'),
			'@ui': path.resolve(__dirname, './src/components/ui'),
			'@icon': path.resolve(__dirname, './src/components/ui/icon'),
		},
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
		allowedHosts: true
		
	},
	
	// Enable SPA fallback: return index.html for unknown routes
	// This allows the client-side router (my-react-router) to handle all routes
	appType: 'spa',
});
