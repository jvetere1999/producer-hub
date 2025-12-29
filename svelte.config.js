import adapterStatic from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const dev = process.env.NODE_ENV === 'development';

/**
 * Deployment target configuration:
 * - GitHub Pages: set BASE_PATH="/<repo-name>" at build time
 * - Cloudflare Pages: set DEPLOY_TARGET="cloudflare" (no base path needed)
 * - Default: static adapter for GitHub Pages
 */
const basePath = process.env.BASE_PATH ?? '';
const deployTarget = process.env.DEPLOY_TARGET ?? 'static';

// Select adapter based on deployment target
function getAdapter() {
	if (deployTarget === 'cloudflare') {
		// Dynamic import for Cloudflare adapter (install with: npm i -D @sveltejs/adapter-cloudflare)
		// For now, fall back to static adapter - uncomment when adapter-cloudflare is installed
		// const adapterCloudflare = await import('@sveltejs/adapter-cloudflare');
		// return adapterCloudflare.default();
		return adapterStatic({
			pages: 'build',
			assets: 'build',
			fallback: 'index.html' // SPA fallback for Cloudflare
		});
	}

	// Default: static adapter for GitHub Pages
	return adapterStatic({
		pages: 'build',
		assets: 'build',
		fallback: null
	});
}

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),

	kit: {
		adapter: getAdapter(),
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
