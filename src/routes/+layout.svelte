<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { registerSW } from 'virtual:pwa-register';
	import { base } from '$app/paths';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { isOnboardingCompleted } from '$lib/onboarding';
	import SettingsPanel from '$lib/components/SettingsPanel.svelte';
	import BottomPlayer from '$lib/components/BottomPlayer.svelte';
	import { playerVisible, playerStore, initAudioController } from '$lib/player';
	import { IconButton, ToastContainer } from '$lib/components/ui';
	import '$lib/design-tokens.css';

	let settingsOpen = false;
	let mounted = false;

	// Safe reactive check for playerVisible with fallback
	$: isPlayerVisible = $playerVisible ?? false;

	// Test event handler for E2E tests
	function handleTestPlayerQueue(e: CustomEvent) {
		const { tracks, startIndex } = e.detail;
		if (tracks && Array.isArray(tracks)) {
			// Initialize audio controller first
			initAudioController();
			playerStore.setQueue(tracks, startIndex || 0);
		}
	}

	onMount(() => {
		registerSW({ immediate: true });
		mounted = true;

		// Check if onboarding is needed (only on main routes, not on onboarding or privacy)
		const path = $page.url.pathname;
		const isExcludedRoute = path.includes('/onboarding') || path.includes('/privacy');

		if (!isExcludedRoute && !isOnboardingCompleted()) {
			goto(`${base}/onboarding`);
		}

		// Register test event listener for E2E tests
		window.addEventListener('test:set-player-queue', handleTestPlayerQueue as EventListener);

		// Expose playerStore for E2E tests (only in browser)
		if (typeof window !== 'undefined') {
			(window as any).__playerStore = playerStore;
			(window as any).__initAudioController = initAudioController;
		}
	});

	onDestroy(() => {
		if (typeof window !== 'undefined') {
			window.removeEventListener('test:set-player-queue', handleTestPlayerQueue as EventListener);
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

<svelte:window onkeydown={handleGlobalKeydown} />

<!-- Settings Cog Button (always visible, fixed position) - hidden on arrange page -->
{#if !$page.url.pathname.includes('/arrange')}
<div class="settings-cog-wrapper">
	<IconButton
		ariaLabel="Open settings"
		title="Settings (⌘,)"
		variant="secondary"
		size="md"
		onclick={openSettings}
	>
		<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
			<circle cx="12" cy="12" r="3"/>
			<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
		</svg>
	</IconButton>
</div>
{/if}

{#if mounted}
	<!-- Settings Panel -->
	<SettingsPanel bind:isOpen={settingsOpen} on:close={closeSettings} />

	<!-- Global Audio Player (only rendered when player is visible) -->
	{#if isPlayerVisible}
		<BottomPlayer />
	{/if}

	<!-- Toast Notifications -->
	<ToastContainer />
{/if}

<div class="main-wrapper" class:has-player={isPlayerVisible}>
	<slot />
</div>


<style>
	/* Settings Cog Wrapper - positions the IconButton */
	.settings-cog-wrapper {
		position: fixed;
		top: var(--space-4);
		right: var(--space-4);
		z-index: var(--z-modal);
		/* Account for iOS safe area */
		top: calc(var(--space-4) + env(safe-area-inset-top));
		right: calc(var(--space-4) + env(safe-area-inset-right));
	}

	.settings-cog-wrapper :global(button) {
		box-shadow: var(--shadow-md);
	}

	.settings-cog-wrapper :global(button:hover) {
		transform: rotate(45deg);
	}

	/* Base HTML/Body scroll setup */
	:global(html) {
		/* Prevent iOS rubber-banding on html */
		height: 100%;
		overflow: hidden;
	}

	:global(body) {
		/* Body fills viewport and is the scroll container */
		height: 100%;
		overflow: hidden;
		/* Prevent layout jumps on iOS */
		-webkit-text-size-adjust: 100%;
		/* Prevent pull-to-refresh interference */
		overscroll-behavior-y: contain;
		/* Ensure proper stacking context */
		position: relative;
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
			/* Prevent sticky hover states on touch */
			background: inherit;
		}
	}

	/* Main wrapper - fills viewport, contains scroll */
	.main-wrapper {
		position: fixed;
		inset: 0;
		display: flex;
		flex-direction: column;
		/* This is the primary scroll container */
		overflow: hidden;
	}

	/* When player is visible, reserve space at bottom */
	.main-wrapper.has-player {
		/* Use token-based player height calculation */
		bottom: var(--player-total-height);
	}

	/* Mobile: use taller player height for two-row layout */
	@media (max-width: 600px) {
		.main-wrapper.has-player {
			bottom: var(--player-total-height-mobile);
		}
	}

	/* Input avoidance - ensure focused inputs scroll into view */
	:global(input:focus),
	:global(textarea:focus),
	:global(select:focus) {
		/* Scroll margin ensures element is visible above the bottom player */
		scroll-margin-bottom: var(--input-scroll-margin);
	}

	/* When player is visible, increase scroll margin for focused inputs */
	.main-wrapper.has-player :global(input:focus),
	.main-wrapper.has-player :global(textarea:focus),
	.main-wrapper.has-player :global(select:focus) {
		scroll-margin-bottom: calc(var(--input-scroll-margin) + var(--space-4));
	}

	/* iOS keyboard avoidance - use visual viewport to handle virtual keyboard */
	@supports (height: 100dvh) {
		:global(body) {
			/* Dynamic viewport height accounts for iOS keyboard */
			min-height: 100dvh;
		}
	}

	/* Ensure inputs scroll into view when focused on iOS Safari */
	@supports (-webkit-touch-callout: none) {
		:global(input:focus),
		:global(textarea:focus),
		:global(select:focus) {
			/* Additional scroll padding for iOS Safari with virtual keyboard */
			scroll-padding-bottom: calc(var(--input-scroll-margin) + var(--space-8));
		}
	}
</style>
