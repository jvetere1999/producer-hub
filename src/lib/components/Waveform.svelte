<!--
  Waveform Component

  Renders audio waveform with playhead, markers, and regions.
  Supports click-to-seek and color-coded amplitude visualization.

  @component
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import type { WaveformData, AudioAnnotations } from '$lib/hub';
	import { getAmplitudeColor, decodeBase64, formatTime } from '$lib/hub';

	export let waveform: WaveformData | null = null;
	export let currentTime = 0;
	export let duration = 0;
	export let annotations: AudioAnnotations | null = null;
	export let theme: 'light' | 'dark' = 'dark';
	export let onSeek: ((time: number) => void) | null = null;
	export let onAddMarker: ((time: number) => void) | null = null;
	export let height = 80;

	let canvas: HTMLCanvasElement;
	let container: HTMLDivElement;
	let ctx: CanvasRenderingContext2D | null = null;
	let width = 600;
	let animationId: number | undefined;

	/**
	 * Normalize peaks for display using logarithmic scaling
	 */
	function normalizePeaksForDisplay(peaks: number[]): number[] {
		if (peaks.length === 0) return [];
		const max = Math.max(...peaks);
		if (max === 0) return peaks.map(() => 0);
		return peaks.map(peak => {
			const normalized = peak / max;
			return Math.log(1 + normalized * 10) / Math.log(11);
		});
	}

	$: if (canvas && waveform) {
		draw();
	}

	$: if (canvas && ctx) {
		// Redraw on time change
		void currentTime;
		draw();
	}

	onMount(() => {
		if (canvas) {
			ctx = canvas.getContext('2d');
			updateSize();
			draw();
		}

		const resizeObserver = new ResizeObserver(() => {
			updateSize();
			draw();
		});

		if (container) {
			resizeObserver.observe(container);
		}

		return () => {
			resizeObserver.disconnect();
			if (animationId) cancelAnimationFrame(animationId);
		};
	});

	function updateSize() {
		if (container) {
			width = container.clientWidth;
			if (canvas) {
				canvas.width = width * window.devicePixelRatio;
				canvas.height = height * window.devicePixelRatio;
				canvas.style.width = `${width}px`;
				canvas.style.height = `${height}px`;
			}
		}
	}

	function draw() {
		if (!ctx || !canvas) return;

		const dpr = window.devicePixelRatio;
		ctx.scale(dpr, dpr);

		// Clear
		ctx.fillStyle = theme === 'dark' ? '#1a1a1c' : '#f6f6f6';
		ctx.fillRect(0, 0, width, height);

		if (!waveform || waveform.peaks.length === 0) {
			// No waveform - draw placeholder
			ctx.fillStyle = theme === 'dark' ? '#333' : '#ddd';
			ctx.fillRect(0, height / 2 - 1, width, 2);
			ctx.setTransform(1, 0, 0, 1, 0, 0);
			return;
		}

		// Use normalized peaks if available, otherwise normalize on the fly
		const peaks = waveform.normalizedPeaks || normalizePeaksForDisplay(waveform.peaks);
		const barWidth = width / peaks.length;
		const centerY = height / 2;

		// Draw regions first (background)
		if (annotations?.regions) {
			for (const region of annotations.regions) {
				const x0 = (region.t0 / duration) * width;
				const x1 = (region.t1 / duration) * width;
				ctx.fillStyle = (region.color || '#3b82f6') + '33'; // 20% opacity
				ctx.fillRect(x0, 0, x1 - x0, height);
			}
		}

		// Draw waveform bars
		for (let i = 0; i < peaks.length; i++) {
			const peak = peaks[i];
			const barHeight = peak * (height - 8);
			const x = i * barWidth;
			const y = centerY - barHeight / 2;

			ctx.fillStyle = getAmplitudeColor(peak, theme);
			ctx.fillRect(x, y, Math.max(1, barWidth - 0.5), barHeight);
		}

		// Draw markers
		if (annotations?.markers) {
			for (const marker of annotations.markers) {
				const x = (marker.t / duration) * width;
				ctx.strokeStyle = marker.color || '#f59e0b';
				ctx.lineWidth = 2;
				ctx.beginPath();
				ctx.moveTo(x, 0);
				ctx.lineTo(x, height);
				ctx.stroke();

				// Draw marker label
				const label = decodeBase64(marker.labelEncoded);
				if (label) {
					ctx.fillStyle = marker.color || '#f59e0b';
					ctx.font = '10px system-ui';
					ctx.fillText(label, x + 4, 12);
				}
			}
		}

		// Draw playhead
		if (duration > 0) {
			const playheadX = (currentTime / duration) * width;
			ctx.strokeStyle = theme === 'dark' ? '#fff' : '#000';
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.moveTo(playheadX, 0);
			ctx.lineTo(playheadX, height);
			ctx.stroke();
		}

		ctx.setTransform(1, 0, 0, 1, 0, 0);
	}

	function handleClick(e: MouseEvent) {
		if (!onSeek || !duration) return;

		const rect = canvas.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const time = (x / width) * duration;
		onSeek(Math.max(0, Math.min(duration, time)));
	}

	function handleDoubleClick(e: MouseEvent) {
		if (!onAddMarker || !duration) return;

		const rect = canvas.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const time = (x / width) * duration;
		onAddMarker(Math.max(0, Math.min(duration, time)));
	}
</script>

<div class="waveform-container" bind:this={container}>
	{#if waveform}
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
		<canvas
			bind:this={canvas}
			class="waveform-canvas"
			onclick={handleClick}
			ondblclick={handleDoubleClick}
			role="slider"
			aria-label="Audio waveform"
			aria-valuemin="0"
			aria-valuemax={duration}
			aria-valuenow={currentTime}
			tabindex="0"
		></canvas>
		<div class="time-display">
			<span>{formatTime(currentTime)}</span>
			<span>{formatTime(duration)}</span>
		</div>
	{:else}
		<div class="waveform-placeholder">
			<span>No waveform data</span>
		</div>
	{/if}
</div>

<style>
	.waveform-container {
		position: relative;
		width: 100%;
	}

	.waveform-canvas {
		display: block;
		width: 100%;
		border-radius: 4px;
		cursor: pointer;
	}

	.waveform-canvas:focus {
		outline: 2px solid #3b82f6;
		outline-offset: 2px;
	}

	.time-display {
		display: flex;
		justify-content: space-between;
		font-size: 11px;
		color: var(--muted);
		margin-top: 4px;
	}

	.waveform-placeholder {
		height: 80px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--card);
		border-radius: 4px;
		color: var(--muted);
		font-size: 13px;
	}
</style>

