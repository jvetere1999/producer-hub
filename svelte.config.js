import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const dev = process.env.NODE_ENV === 'development';

/**
 * For GitHub Pages, set BASE_PATH="/<repo-name>" at build time.
 * Cloudflare Pages: leave BASE_PATH unset.
 */
const basePath = process.env.BASE_PATH ?? '';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),

	kit: {
		adapter: adapter({
			pages: 'build',
			assets: 'build',
			fallback: '200.html'
		}),
		paths: {
			base: dev ? '' : basePath
		},
		prerender: {
			entries: ['*']
		}
	}
};

export default config;
