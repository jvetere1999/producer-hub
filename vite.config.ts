import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
	plugins: [
		sveltekit(),
		VitePWA({
			registerType: 'autoUpdate',
			includeAssets: ['favicon.svg', 'icons/**/*.svg', 'icons/**/*.png'],
			manifest: {
				name: 'Producer Hub',
				short_name: 'Producer Hub',
				description: 'Comprehensive music production workspace with DAW shortcuts, audio analysis, project management, and creative tools.',
				theme_color: '#3b82f6',
				background_color: '#1a1a1a',
				display: 'standalone',
				start_url: '.',
				scope: '.',
				icons: [
					{ src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
					{ src: 'icons/apple-icon-180.png', sizes: '180x180', type: 'image/png' },
					{ src: 'icons/apple-icon-180.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
					{ src: 'icons/apple-icon-180.png', sizes: '512x512', type: 'image/png', purpose: 'any' }
				]
			},
			workbox: {
				cleanupOutdatedCaches: true,
				navigateFallback: 'index.html',
				// Exclude verification files and API endpoints from caching
				navigateFallbackDenylist: [/^\/ads\.txt$/, /^\/robots\.txt$/, /^\/sitemap\.xml$/],
				globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,webmanifest}'],
				// Don't cache ads.txt, robots.txt, sitemap.xml - these should always be fetched fresh
				globIgnores: ['**/ads.txt', '**/robots.txt', '**/sitemap.xml'],
				runtimeCaching: [
					{
						urlPattern: /^https:\/\/pagead2\.googlesyndication\.com\/.*/i,
						handler: 'NetworkOnly'
					},
					{
						urlPattern: /^https:\/\/www\.googletagservices\.com\/.*/i,
						handler: 'NetworkOnly'
					}
				]
			},
			devOptions: {
				enabled: true,
				navigateFallback: undefined,
				suppressWarnings: true
			}
		})
	]
});
