import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
	plugins: [
		sveltekit(),
		VitePWA({
			registerType: 'autoUpdate',
			includeAssets: ['favicon.svg', 'icons/icon.svg'],
			manifest: {
				name: 'DAW Shortcuts',
				short_name: 'DAW Shortcuts',
				description: 'Keyboard shortcuts for DAWs and plugins.',
				theme_color: '#111111',
				background_color: '#111111',
				display: 'standalone',
				start_url: '.',
				scope: '.',
				icons: [
					{ src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
					{ src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
					{
						src: 'icons/icon-512-maskable.png',
						sizes: '512x512',
						type: 'image/png',
						purpose: 'maskable'
					}
				]
			},
			workbox: {
				cleanupOutdatedCaches: true,
				navigateFallback: '200.html',
				globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}']
			},
			devOptions: {
				enabled: true,
				navigateFallback: undefined,
				suppressWarnings: true
			}
		})
	]
});
