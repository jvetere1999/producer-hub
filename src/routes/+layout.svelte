<script lang="ts">
	import { onMount } from 'svelte';
	import { registerSW } from 'virtual:pwa-register';
	import { base } from '$app/paths';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { isOnboardingCompleted } from '$lib/onboarding';
	import SettingsPanel from '$lib/components/SettingsPanel.svelte';

	let settingsOpen = false;
	let mounted = false;

	onMount(() => {
		registerSW({ immediate: true });
		mounted = true;

		// Check if onboarding is needed (only on main routes, not on onboarding or privacy)
		const path = $page.url.pathname;
		const isExcludedRoute = path.includes('/onboarding') || path.includes('/privacy');

		if (!isExcludedRoute && !isOnboardingCompleted()) {
			goto(`${base}/onboarding`);
		}
	});

	function openSettings() {
		settingsOpen = true;
	}

	function closeSettings() {
		settingsOpen = false;
	}

	function handleGlobalKeydown(e: KeyboardEvent) {
		// Settings shortcut: Cmd/Ctrl + ,
		if ((e.metaKey || e.ctrlKey) && e.key === ',') {
			e.preventDefault();
			settingsOpen = !settingsOpen;
		}

		// Help shortcut: ?
		if (e.key === '?' && !e.ctrlKey && !e.metaKey && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
			e.preventDefault();
			settingsOpen = true;
		}
	}
</script>

<svelte:window on:keydown={handleGlobalKeydown} />

{#if mounted}
	<!-- Settings Cog Button (fixed position) -->
	<button
		class="settings-cog"
		on:click={openSettings}
		aria-label="Open settings"
		title="Settings (⌘,)"
	>
		<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
			<circle cx="12" cy="12" r="3"/>
			<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
		</svg>
	</button>

	<!-- Settings Panel -->
	<SettingsPanel bind:isOpen={settingsOpen} on:close={closeSettings} />
{/if}

<slot />

<footer class="site-footer">
	<div class="footer-content">
		<span>© {new Date().getFullYear()} Producer Hub</span>
		<span class="separator">•</span>
		<a href="{base}/privacy">Privacy Policy</a>
	</div>
</footer>

<style>
	/* Settings Cog Button */
	.settings-cog {
		position: fixed;
		top: 1rem;
		right: 1rem;
		z-index: 1000;
		width: 44px;
		height: 44px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--bg-secondary, #2d2d2d);
		border: 1px solid var(--border-default, #3d3d3d);
		border-radius: 50%;
		color: var(--text-secondary, #999);
		cursor: pointer;
		transition: all 0.2s ease;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
	}

	.settings-cog:hover {
		color: var(--text-primary, #fff);
		background: var(--surface-hover, #3d3d3d);
		transform: rotate(45deg);
	}

	.settings-cog:focus {
		outline: 2px solid var(--accent-primary, #3b82f6);
		outline-offset: 2px;
	}

	/* iOS Safe Area Insets */
	:global(html) {
		/* Support for iOS notch/home indicator */
		padding-top: env(safe-area-inset-top);
		padding-left: env(safe-area-inset-left);
		padding-right: env(safe-area-inset-right);
	}

	:global(body) {
		/* Prevent layout jumps on iOS */
		-webkit-text-size-adjust: 100%;
		/* Smooth momentum scrolling */
		-webkit-overflow-scrolling: touch;
		/* Prevent pull-to-refresh interference */
		overscroll-behavior-y: contain;
	}

	/* Touch-friendly button targets (minimum 44px) */
	:global(button),
	:global(a),
	:global([role="button"]) {
		min-height: 44px;
		/* Ensure adequate touch target */
		touch-action: manipulation;
	}

	/* Disable hover effects on touch devices */
	@media (hover: none) {
		:global(button:hover),
		:global(a:hover) {
			/* Prevent sticky hover states on touch - no additional styles needed */
			background: inherit;
		}
	}

	.site-footer {
		margin-top: 2rem;
		padding: 1rem;
		/* Account for iOS home indicator */
		padding-bottom: calc(1rem + env(safe-area-inset-bottom));
		text-align: center;
		font-size: 0.875rem;
		color: var(--text-muted, #6b7280);
		border-top: 1px solid var(--border-default, #374151);
		background: var(--bg-secondary, transparent);
	}

	.footer-content {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.separator {
		opacity: 0.5;
	}

	.site-footer a {
		color: var(--accent-primary, #3b82f6);
		text-decoration: none;
	}

	.site-footer a:hover {
		text-decoration: underline;
		color: var(--accent-secondary, #50b8b8);
	}
</style>

