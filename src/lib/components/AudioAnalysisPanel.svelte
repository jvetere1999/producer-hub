<!--
  Audio Analysis Panel

  Detailed analysis visualization for reference tracks including:
  - Frequency spectrum (lows, mids, highs)
  - Waveform statistics
  - Audio metrics (RMS, dynamic range, crest factor)
  - Real-time generation progress

  @component
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import type { ReferenceTrack, FrequencySpectrum } from '$lib/hub';
	import { analyzeFrequencySpectrum, type WaveformProgress } from '$lib/hub';

	export let track: ReferenceTrack | null = null;
	export let arrayBuffer: ArrayBuffer | null = null;
	export let onAnalysisComplete: ((analysis: FrequencySpectrum) => void) | null = null;

	let isAnalyzing = false;
	let analysisProgress: WaveformProgress | null = null;
	let spectrum: FrequencySpectrum | null = null;
	let abortController: AbortController | null = null;

	async function generateAnalysis() {
		if (!arrayBuffer || !track) return;

		isAnalyzing = true;
		abortController = new AbortController();

		try {
			spectrum = await analyzeFrequencySpectrum(
				arrayBuffer,
				(progress) => {
					analysisProgress = {
						stage: progress === 1 ? 'done' : 'computing',
						progress,
						message: `Analyzing ${Math.round(progress * 100)}%`
					};
				},
				abortController.signal
			);

			if (spectrum) {
				onAnalysisComplete?.(spectrum);
			}
		} catch (e) {
			console.error('Analysis failed:', e);
			analysisProgress = {
				stage: 'error',
				progress: 0,
				message: 'Analysis failed'
			};
		} finally {
			isAnalyzing = false;
			analysisProgress = null;
		}
	}

	function cancelAnalysis() {
		if (abortController) {
			abortController.abort();
			isAnalyzing = false;
			analysisProgress = null;
		}
	}

	onMount(() => {
		return () => {
			cancelAnalysis();
		};
	});


	function getEnergyBarWidth(energy: number): string {
		return `${Math.min(100, energy * 100)}%`;
	}
</script>

	<div class="analysis-panel">
		<div class="panel-header">
			<h3>◈ Audio Analysis</h3>
		{#if track?.name}
			<span class="track-name">{track.name}</span>
		{/if}
	</div>

	{#if isAnalyzing}
		<div class="progress-container">
			<div class="progress-bar">
				<div class="progress-fill" style="width: {(analysisProgress?.progress || 0) * 100}%"></div>
			</div>
			<p class="progress-text">{analysisProgress?.message}</p>
			<button class="btn-cancel" onclick={cancelAnalysis}>Cancel</button>
		</div>
	{:else if spectrum}
		<div class="spectrum-container">
			<!-- Frequency Bands -->
			<div class="bands-section">
				<h4>Frequency Bands</h4>
				<div class="bands-grid">
					{#each spectrum.bands as band}
						<div class="band-card">
							<div class="band-header">
								<span class="band-name" style="color: {band.color}">
									{band.name.toUpperCase()}
								</span>
								<span class="band-freq">
									{band.freqRange[0].toFixed(0)} - {band.freqRange[1].toFixed(0)} Hz
								</span>
							</div>

							<div class="energy-bar-container">
								<div class="energy-label">Energy</div>
								<div class="energy-bar">
									<div
										class="energy-fill"
										style="width: {getEnergyBarWidth(band.energy)}; background-color: {band.color}"
									></div>
								</div>
								<div class="energy-value">{(band.energy * 100).toFixed(1)}%</div>
							</div>

							<div class="band-metrics">
								<div class="metric">
									<span class="metric-label">Peak</span>
									<span class="metric-value">{(band.peak * 100).toFixed(1)}%</span>
								</div>
								<div class="metric">
									<span class="metric-label">Average</span>
									<span class="metric-value">{(band.average * 100).toFixed(1)}%</span>
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>

			<!-- Overall Statistics -->
			<div class="stats-section">
				<h4>Overall Statistics</h4>
				<div class="stats-grid">
					<div class="stat-item">
						<span class="stat-label">RMS Energy</span>
						<span class="stat-value">{(spectrum.overallRMS * 100).toFixed(1)}%</span>
					</div>
					<div class="stat-item">
						<span class="stat-label">Peak Amplitude</span>
						<span class="stat-value">{(spectrum.peakAmplitude * 100).toFixed(1)}%</span>
					</div>
					<div class="stat-item">
						<span class="stat-label">Dynamic Range</span>
						<span class="stat-value">{spectrum.dynamicRange.toFixed(1)} dB</span>
					</div>
					<div class="stat-item">
						<span class="stat-label">Crest Factor</span>
						<span class="stat-value">{spectrum.crestFactor.toFixed(2)}</span>
					</div>
				</div>

				<div class="info-text">
					<strong>Dynamic Range:</strong> Difference between loudest and quietest parts (dB)
					<br />
					<strong>Crest Factor:</strong> Ratio of peak to average power (higher = more dynamic)
				</div>
			</div>

			<!-- Analyzed Info -->
			<div class="analysis-info">
				<small>Analyzed: {new Date(spectrum.analyzedAt).toLocaleString()}</small>
			</div>
		</div>
	{:else}
		<div class="no-analysis">
			<p>No frequency spectrum analysis yet</p>
			<button class="btn-analyze" onclick={generateAnalysis} disabled={isAnalyzing}>
				◈ Analyze Audio
			</button>
		</div>
	{/if}
</div>

<style>
	.analysis-panel {
		background: var(--bg-secondary);
		border: 1px solid var(--border-color);
		border-radius: 8px;
		padding: 1rem;
		margin-bottom: 1rem;
		max-height: 500px;
		overflow-y: auto;
	}

	.panel-header {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-bottom: 1rem;
		border-bottom: 1px solid var(--border-color);
		padding-bottom: 0.75rem;
	}

	.panel-header h3 {
		margin: 0;
		font-size: 1rem;
		font-weight: 600;
	}

	.track-name {
		font-size: 0.875rem;
		color: var(--text-secondary);
		margin-left: auto;
	}

	.progress-container {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.progress-bar {
		height: 4px;
		background: var(--border-color);
		border-radius: 2px;
		overflow: hidden;
	}

	.progress-fill {
		height: 100%;
		background: linear-gradient(90deg, #3b82f6, #8b5cf6);
		transition: width 0.2s ease;
	}

	.progress-text {
		font-size: 0.875rem;
		color: var(--text-secondary);
		margin: 0;
		text-align: center;
	}

	.btn-cancel {
		padding: 0.5rem 1rem;
		background: #ef4444;
		color: white;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.875rem;
		transition: background 0.2s;
	}

	.btn-cancel:hover {
		background: #dc2626;
	}

	.spectrum-container {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.bands-section h4,
	.stats-section h4 {
		margin: 0 0 1rem 0;
		font-size: 0.95rem;
		font-weight: 600;
		color: var(--text-primary);
	}

	.bands-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
	}

	.band-card {
		background: var(--bg-primary);
		border: 1px solid var(--border-color);
		border-radius: 6px;
		padding: 1rem;
	}

	.band-header {
		display: flex;
		justify-content: space-between;
		margin-bottom: 0.75rem;
		font-size: 0.875rem;
	}

	.band-name {
		font-weight: 600;
		font-size: 0.95rem;
	}

	.band-freq {
		color: var(--text-secondary);
		font-size: 0.8rem;
	}

	.energy-bar-container {
		margin-bottom: 0.75rem;
	}

	.energy-label {
		font-size: 0.8rem;
		color: var(--text-secondary);
		margin-bottom: 0.25rem;
	}

	.energy-bar {
		height: 12px;
		background: var(--bg-secondary);
		border-radius: 2px;
		overflow: hidden;
		margin-bottom: 0.25rem;
	}

	.energy-fill {
		height: 100%;
		transition: width 0.3s ease;
	}

	.energy-value {
		font-size: 0.75rem;
		text-align: right;
		color: var(--text-secondary);
	}

	.band-metrics {
		display: flex;
		gap: 0.5rem;
		font-size: 0.8rem;
	}

	.metric {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.metric-label {
		color: var(--text-secondary);
	}

	.metric-value {
		font-weight: 600;
		color: var(--text-primary);
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.stat-item {
		background: var(--bg-primary);
		border: 1px solid var(--border-color);
		border-radius: 6px;
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.stat-label {
		font-size: 0.8rem;
		color: var(--text-secondary);
		font-weight: 500;
	}

	.stat-value {
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--text-primary);
	}

	.info-text {
		font-size: 0.8rem;
		color: var(--text-secondary);
		line-height: 1.5;
		background: var(--bg-primary);
		padding: 0.75rem;
		border-radius: 4px;
	}

	.analysis-info {
		text-align: center;
		font-size: 0.75rem;
		color: var(--text-secondary);
		padding-top: 0.75rem;
		border-top: 1px solid var(--border-color);
	}

	.no-analysis {
		text-align: center;
		padding: 2rem 1rem;
		color: var(--text-secondary);
	}

	.no-analysis p {
		margin: 0 0 1rem 0;
		font-size: 0.95rem;
	}

	.btn-analyze {
		padding: 0.75rem 1.5rem;
		background: linear-gradient(135deg, #3b82f6, #8b5cf6);
		color: white;
		border: none;
		border-radius: 6px;
		cursor: pointer;
		font-weight: 600;
		transition: opacity 0.2s;
	}

	.btn-analyze:hover:not(:disabled) {
		opacity: 0.9;
	}

	.btn-analyze:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	:global(:root) {
		--bg-primary: #1a1a1c;
		--bg-secondary: #2a2a2c;
		--text-primary: #ffffff;
		--text-secondary: #a0aec0;
		--border-color: #404043;
	}

	:global(.light) {
		--bg-primary: #ffffff;
		--bg-secondary: #f6f6f6;
		--text-primary: #000000;
		--text-secondary: #6b7280;
		--border-color: #e5e7eb;
	}
</style>

