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
			fallback: null
		}),
		paths: {
			base: dev ? '' : basePath,
			assets: dev ? '' : basePath
		},
		prerender: {
			entries: ['*'],
			handleHttpError: ({ path, referrer, message }) => {
				// Ignore 404s for product icons during prerendering
				// These are static assets that exist but the prerenderer can't resolve them
				if (path.startsWith('/icons/products/') || path.includes('icons/products/')) {
					console.warn(`[prerender] Ignoring expected 404 for static asset: ${path}`);
					return;
				}
				// Throw on other errors
				throw new Error(message);
			}
		}
	}
};

export default config;
