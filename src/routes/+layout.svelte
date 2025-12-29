<script lang="ts">
	import { onMount } from 'svelte';
	import { registerSW } from 'virtual:pwa-register';
	import { base } from '$app/paths';

	onMount(() => {
		registerSW({ immediate: true });
	});
</script>

<slot />

<footer class="site-footer">
	<div class="footer-content">
		<span>© {new Date().getFullYear()} Producer Hub</span>
		<span class="separator">•</span>
		<a href="{base}/privacy">Privacy Policy</a>
	</div>
</footer>

<style>
	.site-footer {
		margin-top: 2rem;
		padding: 1rem;
		text-align: center;
		font-size: 0.875rem;
		color: var(--color-text-muted, #6b7280);
		border-top: 1px solid var(--color-border, #e5e7eb);
	}

	:global([data-theme="dark"]) .site-footer {
		color: #9ca3af;
		border-top-color: #374151;
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
		color: var(--color-primary, #3b82f6);
		text-decoration: none;
	}

	.site-footer a:hover {
		text-decoration: underline;
	}
</style>

