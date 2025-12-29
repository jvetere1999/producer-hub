<!--
  References Component

  Reference track library with audio playback, waveform visualization,
  detailed frequency spectrum analysis, and annotation support.
  Supports folder import via File System Access API.

  @component
-->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import Waveform from './Waveform.svelte';
	import AudioAnalysisPanel from './AudioAnalysisPanel.svelte';
	import {
		loadReferences,
		saveReferences,
		createReferenceLibrary,
		updateReferenceLibrary,
		deleteReferenceLibrary,
		listReferenceLibraries,
		getReferenceLibrary,
		storeBlob,
		getBlob,
		deleteBlob,
		generateWaveform,
		analyzeAudio,
		createEmptyAnnotations,
		addMarker,
		decodeBase64,
		generateId,
		formatTime,
		hasFileSystemAccess,
		type ReferencesState,
		type ReferenceLibrary,
		type ReferenceTrack,
		type WaveformProgress,
		ANNOTATION_COLORS
	} from '$lib/hub';

	// State
	let state: ReferencesState = { version: 1, libraries: {}, order: [] };
	let libraries: ReferenceLibrary[] = [];
	let selectedLibraryId: string | null = null;
	let selectedLibrary: ReferenceLibrary | null = null;
	let selectedTrackId: string | null = null;
	let selectedTrack: ReferenceTrack | null = null;
	let selectedTrackArrayBuffer: ArrayBuffer | null = null;
	let showAnalysisPanel = false;

	// Playback state
	let audio: HTMLAudioElement | null = null;
	let isPlaying = false;
	let currentTime = 0;
	let duration = 0;
	let volume = 0.8;

	// UI state
	let isCreatingLibrary = false;
	let newLibraryName = '';
	let waveformProgress: WaveformProgress | null = null;
	let isAnalyzing = false;
	let showPlayerModal = false;

	// Marker creation
	let newMarkerLabel = '';
	let showMarkerInput = false;
	let markerTime = 0;

	onMount(() => {
		state = loadReferences();
		libraries = listReferenceLibraries(state);

		audio = new Audio();
		audio.volume = volume;

		audio.addEventListener('timeupdate', () => {
			currentTime = audio?.currentTime || 0;
		});

		audio.addEventListener('loadedmetadata', () => {
			duration = audio?.duration || 0;
		});

		audio.addEventListener('ended', () => {
			isPlaying = false;
		});

		audio.addEventListener('play', () => {
			isPlaying = true;
		});

		audio.addEventListener('pause', () => {
			isPlaying = false;
		});
	});

	onDestroy(() => {
		if (audio) {
			audio.pause();
			audio.src = '';
		}
	});

	function refreshLibraries() {
		libraries = listReferenceLibraries(state);
		if (selectedLibraryId) {
			selectedLibrary = getReferenceLibrary(state, selectedLibraryId) || null;
			if (selectedTrackId && selectedLibrary) {
				selectedTrack = selectedLibrary.tracks.find(t => t.id === selectedTrackId) || null;
			}
		}
	}

	$: {
		void state;
		refreshLibraries();
	}

	function selectLibrary(id: string) {
		selectedLibraryId = id;
		selectedLibrary = getReferenceLibrary(state, id) || null;
		selectedTrackId = null;
		selectedTrack = null;
		stopPlayback();
	}

	async function selectTrack(track: ReferenceTrack) {
		selectedTrackId = track.id;
		selectedTrack = track;
		showAnalysisPanel = true;
		showPlayerModal = true;

		// Load audio from IndexedDB
		const result = await getBlob(track.blobId);
		if (result && audio) {
			const blob = result.blob instanceof Blob ? result.blob : new Blob([result.blob]);

			// Load for playback
			audio.src = URL.createObjectURL(blob);
			audio.load();

			// Load as ArrayBuffer for analysis
			try {
				selectedTrackArrayBuffer = await blob.arrayBuffer();
			} catch (e) {
				console.error('Failed to load array buffer:', e);
			}
		}
	}

	function startCreateLibrary() {
		isCreatingLibrary = true;
		newLibraryName = '';
	}

	function createNewLibrary() {
		if (!newLibraryName.trim()) return;

		const result = createReferenceLibrary(state, { name: newLibraryName.trim() });
		state = result.state;
		saveReferences(state);
		isCreatingLibrary = false;
		selectLibrary(result.library.id);
	}

	function handleDeleteLibrary() {
		if (!selectedLibraryId) return;
		if (!confirm('Delete this library and all its tracks?')) return;

		// Delete all track blobs
		if (selectedLibrary) {
			for (const track of selectedLibrary.tracks) {
				deleteBlob(track.blobId).catch(console.error);
			}
		}

		state = deleteReferenceLibrary(state, selectedLibraryId);
		saveReferences(state);
		selectedLibraryId = null;
		selectedLibrary = null;
	}

	async function handleImportFolder() {
		if (!selectedLibraryId || !selectedLibrary) return;

		try {
			let files: File[] = [];

			if (hasFileSystemAccess()) {
				// Use File System Access API
				const handle = await (window as any).showDirectoryPicker();
				files = await readFilesFromDirectory(handle);
			} else {
				// Fallback to file input
				files = await selectFilesWithInput();
			}

			// Filter audio files
			const audioFiles = files.filter(f =>
				f.type.startsWith('audio/') ||
				/\.(mp3|wav|flac|ogg|m4a|aac|webm)$/i.test(f.name)
			);

			if (audioFiles.length === 0) {
				alert('No audio files found in selection');
				return;
			}

			// Import files
			const newTracks: ReferenceTrack[] = [];

			for (const file of audioFiles) {
				const blobId = generateId();

				// Store blob in IndexedDB
				await storeBlob(blobId, file, {
					name: file.name,
					mime: file.type,
					size: file.size
				});

				const track: ReferenceTrack = {
					id: generateId(),
					name: file.name,
					mime: file.type,
					size: file.size,
					lastModified: file.lastModified,
					blobId
				};

				newTracks.push(track);
			}

			// Update library
			state = updateReferenceLibrary(state, selectedLibraryId, {
				tracks: [...selectedLibrary.tracks, ...newTracks]
			});
			saveReferences(state);

			// Generate waveforms in background
			for (const track of newTracks) {
				generateWaveformForTrack(track.id);
			}

		} catch (e) {
			if ((e as Error).name !== 'AbortError') {
				console.error('Import failed:', e);
				alert('Failed to import files');
			}
		}
	}

	async function readFilesFromDirectory(handle: FileSystemDirectoryHandle): Promise<File[]> {
		const files: File[] = [];

		for await (const entry of (handle as any).values()) {
			if (entry.kind === 'file') {
				const file = await entry.getFile();
				files.push(file);
			}
		}

		return files;
	}

	function selectFilesWithInput(): Promise<File[]> {
		return new Promise((resolve) => {
			const input = document.createElement('input');
			input.type = 'file';
			input.multiple = true;
			input.accept = 'audio/*';
			input.webkitdirectory = true;

			input.onchange = () => {
				resolve(Array.from(input.files || []));
			};

			input.click();
		});
	}

	async function generateWaveformForTrack(trackId: string) {
		if (!selectedLibraryId || !selectedLibrary) return;

		const track = selectedLibrary.tracks.find(t => t.id === trackId);
		if (!track) return;

		waveformProgress = { stage: 'decoding', progress: 0 };

		try {
			const result = await getBlob(track.blobId);
			if (!result) return;

			const arrayBuffer = result.blob instanceof Blob
				? await result.blob.arrayBuffer()
				: result.blob;

			const waveform = await generateWaveform(
				arrayBuffer,
				(progress) => { waveformProgress = progress; }
			);

			if (waveform) {
				// Get basic metadata
				let durationSec = waveform.durationSec;
				let sampleRate: number | undefined;
				let channels: number | undefined;

				try {
					const audioContext = new AudioContext();
					const buffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
					durationSec = buffer.duration;
					sampleRate = buffer.sampleRate;
					channels = buffer.numberOfChannels;
					await audioContext.close();
				} catch {
					// Ignore decode errors for metadata
				}

				// Update track in library
				const updatedTracks = selectedLibrary.tracks.map(t =>
					t.id === trackId ? { ...t, waveform, durationSec, sampleRate, channels } : t
				);

				state = updateReferenceLibrary(state, selectedLibraryId, { tracks: updatedTracks });
				saveReferences(state);
			}
		} catch (e) {
			console.error('Waveform generation failed:', e);
		} finally {
			waveformProgress = null;
		}
	}

	async function analyzeTrack(trackId: string) {
		if (!selectedLibraryId || !selectedLibrary) return;

		const track = selectedLibrary.tracks.find(t => t.id === trackId);
		if (!track) return;

		isAnalyzing = true;

		try {
			const result = await getBlob(track.blobId);
			if (!result) return;

			const arrayBuffer = result.blob instanceof Blob
				? await result.blob.arrayBuffer()
				: result.blob;

			const analysis = await analyzeAudio(arrayBuffer);

			if (analysis) {
				const updatedTracks = selectedLibrary.tracks.map(t =>
					t.id === trackId ? { ...t, analysis } : t
				);

				state = updateReferenceLibrary(state, selectedLibraryId, { tracks: updatedTracks });
				saveReferences(state);
			}
		} catch (e) {
			console.error('Analysis failed:', e);
		} finally {
			isAnalyzing = false;
		}
	}

	function togglePlayback() {
		if (!audio) return;

		if (isPlaying) {
			audio.pause();
		} else {
			audio.play();
		}
	}

	function stopPlayback() {
		if (audio) {
			audio.pause();
			audio.currentTime = 0;
		}
		currentTime = 0;
		isPlaying = false;
	}

	function closePlayerModal() {
		showPlayerModal = false;
		showAnalysisPanel = false;
		stopPlayback();
		selectedTrackId = null;
		selectedTrack = null;
		selectedTrackArrayBuffer = null;
	}

	function handleSeek(time: number) {
		if (audio) {
			audio.currentTime = time;
			currentTime = time;
		}
	}

	function handleVolumeChange(e: Event) {
		const value = parseFloat((e.target as HTMLInputElement).value);
		volume = value;
		if (audio) audio.volume = value;
	}

	function startAddMarker(time: number) {
		markerTime = time;
		newMarkerLabel = '';
		showMarkerInput = true;
	}

	function saveMarker() {
		if (!selectedTrack || !selectedLibrary || !selectedLibraryId) return;

		const annotations = selectedTrack.annotations || createEmptyAnnotations();
		const color = ANNOTATION_COLORS[annotations.markers.length % ANNOTATION_COLORS.length];
		const updated = addMarker(annotations, markerTime, newMarkerLabel || 'Marker', color);

		const updatedTracks = selectedLibrary.tracks.map(t =>
			t.id === selectedTrack!.id ? { ...t, annotations: updated } : t
		);

		state = updateReferenceLibrary(state, selectedLibraryId, { tracks: updatedTracks });
		saveReferences(state);
		showMarkerInput = false;
	}

	function addMarkerAtPlayhead() {
		startAddMarker(currentTime);
	}

	function deleteTrack(trackId: string) {
		if (!selectedLibrary || !selectedLibraryId) return;
		if (!confirm('Delete this track?')) return;

		const track = selectedLibrary.tracks.find(t => t.id === trackId);
		if (track) {
			deleteBlob(track.blobId).catch(console.error);
		}

		const updatedTracks = selectedLibrary.tracks.filter(t => t.id !== trackId);
		state = updateReferenceLibrary(state, selectedLibraryId, { tracks: updatedTracks });
		saveReferences(state);

		if (selectedTrackId === trackId) {
			selectedTrackId = null;
			selectedTrack = null;
			stopPlayback();
		}
	}

	function formatBytes(bytes: number | undefined): string {
		if (!bytes) return '';
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}
</script>

<div class="references">
	<!-- Sidebar: Libraries -->
	<div class="sidebar">
		<div class="sidebar-header">
			<h2>Libraries</h2>
			<button class="btn btn-primary btn-small" onclick={startCreateLibrary}>+ New</button>
		</div>

		{#if isCreatingLibrary}
			<div class="create-form">
				<input
					type="text"
					bind:value={newLibraryName}
					placeholder="Library name..."
					class="input"
					onkeydown={(e) => e.key === 'Enter' && createNewLibrary()}
				/>
				<div class="create-actions">
					<button class="btn btn-small btn-primary" onclick={createNewLibrary}>Create</button>
					<button class="btn btn-small btn-ghost" onclick={() => isCreatingLibrary = false}>Cancel</button>
				</div>
			</div>
		{/if}

		<div class="library-list">
			{#if libraries.length === 0}
				<div class="empty">No libraries yet</div>
			{:else}
				{#each libraries as library (library.id)}
					<button
						class="library-item"
						class:selected={library.id === selectedLibraryId}
						onclick={() => selectLibrary(library.id)}
					>
						<span class="library-name">{library.name}</span>
						<span class="library-count">{library.tracks.length} tracks</span>
					</button>
				{/each}
			{/if}
		</div>
	</div>

	<!-- Main Content -->
	<div class="main">
		{#if selectedLibrary}
			<div class="library-header">
				<h2>{selectedLibrary.name}</h2>
				<div class="library-actions">
					<button class="btn btn-small" onclick={handleImportFolder}>
						📁 Import Folder
					</button>
					<button class="btn btn-small btn-danger" onclick={handleDeleteLibrary}>Delete</button>
				</div>
			</div>

			<!-- Track List -->
			<div class="track-list">
				{#if selectedLibrary.tracks.length === 0}
					<div class="empty">No tracks yet. Import a folder to get started.</div>
				{:else}
					{#each selectedLibrary.tracks as track (track.id)}
						<div
							class="track-item"
							class:selected={track.id === selectedTrackId}
						>
							<button class="track-content" onclick={() => selectTrack(track)}>
								<span class="track-name">{track.name}</span>
								<span class="track-meta">
									{#if track.durationSec}
										{formatTime(track.durationSec)}
									{/if}
									{#if track.size}
										· {formatBytes(track.size)}
									{/if}
									{#if track.analysis?.bpm}
										· ~{track.analysis.bpm} BPM
									{/if}
								</span>
							</button>
							<div class="track-actions">
								{#if !track.waveform}
									<button
										class="btn-icon"
										title="Generate waveform"
										onclick={() => generateWaveformForTrack(track.id)}
									>◉</button>
								{/if}
								{#if !track.analysis}
									<button
										class="btn-icon"
										title="Analyze BPM"
										onclick={() => analyzeTrack(track.id)}
									>◈</button>
								{/if}
								<button
									class="btn-icon"
									title="Delete"
									onclick={() => deleteTrack(track.id)}
								>✕</button>
							</div>
						</div>
					{/each}
				{/if}
			</div>

			{#if selectedTrack}
				<div class="player-status">
					<span>🎵 Now loaded: {selectedTrack.name}</span>
					<button class="btn btn-small" onclick={() => showPlayerModal = true}>
						Open Player
					</button>
				</div>
			{/if}
		{:else}
			<div class="empty-state">
				<p>Select a library or create a new one</p>
			</div>
		{/if}
	</div>

	<!-- Full-Window Player Modal -->
	{#if showPlayerModal && selectedTrack}
		<div class="player-modal-backdrop" onclick={closePlayerModal} role="presentation">
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<div class="player-modal" onclick={(e) => e.stopPropagation()}>
				<!-- Modal Header -->
				<div class="modal-header">
					<div class="modal-title">
						<h2>🎵 {selectedTrack.name}</h2>
						{#if selectedTrack.analysis}
							<span class="analysis-badge">
								{#if selectedTrack.analysis.bpm}~{selectedTrack.analysis.bpm} BPM{/if}
								{#if selectedTrack.analysis.key} · {selectedTrack.analysis.key}{/if}
								<span class="heuristic">(auto-detected)</span>
							</span>
						{/if}
					</div>
					<button class="modal-close" onclick={closePlayerModal}>✕</button>
				</div>

				<!-- Modal Content -->
				<div class="modal-content">
					<!-- Audio Analysis Panel -->
					{#if showAnalysisPanel && selectedTrackArrayBuffer}
						<AudioAnalysisPanel
							track={selectedTrack}
							arrayBuffer={selectedTrackArrayBuffer}
							onAnalysisComplete={(analysis) => {
								// Update track with new analysis
								if (selectedLibraryId && selectedTrack) {
									const updatedTracks = selectedLibrary!.tracks.map(t =>
										t.id === selectedTrack!.id
											? {
													...t,
													analysis: {
														version: 1 as const,
														source: (t.analysis?.source ?? 'webaudio') as 'heuristic' | 'webaudio',
														...t.analysis,
														spectrum: analysis
													}
											  }
											: t
									);
									state = updateReferenceLibrary(state, selectedLibraryId, { tracks: updatedTracks });
									saveReferences(state);
									refreshLibraries();
									selectedLibrary = getReferenceLibrary(state, selectedLibraryId) || null;
									selectedTrack = selectedLibrary?.tracks.find(t => t.id === selectedTrack!.id) || null;
								}
							}}
						/>
					{/if}

					<!-- Waveform Section -->
					<div class="waveform-section">
						{#if waveformProgress}
							<div class="progress-bar">
								<div class="progress-fill" style="width: {waveformProgress.progress * 100}%"></div>
								<span class="progress-text">{waveformProgress.stage}...</span>
							</div>
						{:else}
							<Waveform
								waveform={selectedTrack.waveform}
								{currentTime}
								{duration}
								annotations={selectedTrack.annotations}
								onSeek={handleSeek}
								onAddMarker={startAddMarker}
							/>
						{/if}
					</div>

					<!-- Transport Controls -->
					<div class="transport-section">
						<div class="transport">
							<button class="btn-transport" onclick={togglePlayback}>
								{isPlaying ? '⏸' : '▶'}
							</button>
							<button class="btn-transport" onclick={stopPlayback}>⏹</button>
							<button class="btn-transport" onclick={addMarkerAtPlayhead} title="Add marker (M)">
								🏷
							</button>

							<div class="time-display">
								<span>{formatTime(currentTime)} / {formatTime(duration)}</span>
							</div>

							<div class="volume-control">
								<span>🔊</span>
								<input
									type="range"
									min="0"
									max="1"
									step="0.01"
									value={volume}
									oninput={handleVolumeChange}
									class="volume-slider"
								/>
							</div>
						</div>
					</div>

					<!-- Markers Section -->
					{#if selectedTrack.annotations?.markers.length}
						<div class="markers-section">
							<h4>Markers</h4>
							<div class="markers-list">
								{#each selectedTrack.annotations.markers as marker (marker.id)}
									<button
										class="marker-chip"
										style="border-color: {marker.color}"
										onclick={() => handleSeek(marker.t)}
									>
										<span class="marker-time">{formatTime(marker.t)}</span>
										<span class="marker-label">{decodeBase64(marker.labelEncoded)}</span>
									</button>
								{/each}
							</div>
						</div>
					{/if}
				</div>
			</div>
		</div>
	{/if}

	<!-- Marker Input Modal -->
	{#if showMarkerInput}
		<div class="modal-backdrop" onclick={() => showMarkerInput = false} role="presentation">
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<div class="modal" onclick={(e) => e.stopPropagation()}>
				<h3>Add Marker at {formatTime(markerTime)}</h3>
				<input
					type="text"
					bind:value={newMarkerLabel}
					placeholder="Marker label..."
					class="modal-input"
					onkeydown={(e) => e.key === 'Enter' && saveMarker()}
				/>
				<div class="modal-actions">
					<button class="btn btn-primary" onclick={saveMarker}>Add</button>
					<button class="btn btn-ghost" onclick={() => showMarkerInput = false}>Cancel</button>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.references {
		display: flex;
		height: 100%;
		min-height: 500px;
		overflow: auto;
	}

	.sidebar {
		width: 240px;
		border-right: 1px solid var(--border);
		display: flex;
		flex-direction: column;
	}

	.sidebar-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 16px;
		border-bottom: 1px solid var(--border);
	}

	.sidebar-header h2 {
		margin: 0;
		font-size: 16px;
	}

	.create-form {
		padding: 12px;
		border-bottom: 1px solid var(--border);
	}

	.create-actions {
		display: flex;
		gap: 8px;
		margin-top: 8px;
	}

	.library-list {
		flex: 1;
		overflow-y: auto;
		padding: 8px;
	}

	.library-item {
		display: flex;
		flex-direction: column;
		width: 100%;
		padding: 10px 12px;
		background: transparent;
		border: none;
		border-radius: 6px;
		cursor: pointer;
		text-align: left;
		color: var(--fg);
	}

	.library-item:hover {
		background: var(--accent);
	}

	.library-item.selected {
		background: var(--accent);
		border: 1px solid var(--border);
	}

	.library-name {
		font-size: 14px;
		font-weight: 500;
	}

	.library-count {
		font-size: 11px;
		color: var(--muted);
	}

	.main {
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.library-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 16px;
		border-bottom: 1px solid var(--border);
	}

	.library-header h2 {
		margin: 0;
		font-size: 18px;
	}

	.library-actions {
		display: flex;
		gap: 8px;
	}

	.track-list {
		flex: 1;
		overflow-y: auto;
		padding: 8px;
	}

	.track-item {
		display: flex;
		align-items: center;
		padding: 8px 12px;
		background: var(--card);
		border: 1px solid transparent;
		border-radius: 6px;
		margin-bottom: 4px;
	}

	.track-item.selected {
		border-color: #3b82f6;
	}

	.track-content {
		flex: 1;
		display: flex;
		flex-direction: column;
		background: none;
		border: none;
		text-align: left;
		cursor: pointer;
		color: var(--fg);
		padding: 0;
	}

	.track-name {
		font-size: 13px;
		font-weight: 500;
	}

	.track-meta {
		font-size: 11px;
		color: var(--muted);
	}

	.track-actions {
		display: flex;
		gap: 4px;
	}


	.progress-bar {
		position: relative;
		height: 80px;
		background: var(--bg);
		border-radius: 4px;
		overflow: hidden;
	}

	.progress-fill {
		position: absolute;
		height: 100%;
		background: #3b82f6;
		opacity: 0.3;
	}

	.progress-text {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		color: var(--muted);
		font-size: 13px;
	}

	.transport {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-top: 12px;
	}

	.btn-transport {
		padding: 8px 12px;
		background: var(--accent);
		border: 1px solid var(--border);
		border-radius: 6px;
		cursor: pointer;
		font-size: 16px;
	}

	.volume-control {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-left: auto;
	}

	.volume-slider {
		width: 80px;
	}

	.markers-section {
		margin-top: 16px;
		padding-top: 12px;
		border-top: 1px solid var(--border);
	}

	.markers-section h4 {
		margin: 0 0 8px 0;
		font-size: 12px;
		font-weight: 600;
		color: var(--muted);
	}

	.markers-list {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}

	.marker-chip {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 4px 10px;
		background: var(--bg);
		border: 2px solid;
		border-radius: 16px;
		cursor: pointer;
		font-size: 12px;
		color: var(--fg);
	}

	.marker-time {
		color: var(--muted);
		font-family: monospace;
	}

	.empty {
		padding: 24px;
		text-align: center;
		color: var(--muted);
		font-size: 13px;
	}

	.empty-state {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--muted);
	}

	.btn {
		padding: 8px 14px;
		border: none;
		border-radius: 6px;
		font-size: 13px;
		font-weight: 500;
		cursor: pointer;
	}

	.btn-primary {
		background: #3b82f6;
		color: white;
	}

	.btn-ghost {
		background: transparent;
		color: var(--muted);
		border: 1px solid var(--border);
	}

	.btn-small {
		padding: 6px 10px;
		font-size: 12px;
	}

	.btn-danger {
		background: #ef4444;
		color: white;
	}

	.btn-icon {
		background: none;
		border: none;
		cursor: pointer;
		padding: 4px;
		font-size: 14px;
		opacity: 0.7;
	}

	.btn-icon:hover {
		opacity: 1;
	}

	.input {
		width: 100%;
		padding: 8px 12px;
		background: var(--bg);
		border: 1px solid var(--border);
		border-radius: 6px;
		color: var(--fg);
		font-size: 13px;
	}

	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
	}

	.modal {
		background: var(--card);
		border: 1px solid var(--border);
		border-radius: 12px;
		padding: 24px;
		width: 100%;
		max-width: 400px;
	}

	.modal h3 {
		margin: 0 0 16px 0;
		font-size: 18px;
	}

	.modal-input {
		width: 100%;
		padding: 12px;
		background: var(--bg);
		border: 1px solid var(--border);
		border-radius: 6px;
		color: var(--fg);
		font-size: 14px;
		margin-bottom: 16px;
	}

	.modal-actions {
		display: flex;
		gap: 8px;
		justify-content: flex-end;
	}

	/* Player Modal Styles */
	.player-modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.8);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1001;
		padding: 20px;
	}

	.player-modal {
		background: var(--card);
		border: 1px solid var(--border);
		border-radius: 16px;
		width: 100%;
		height: 100%;
		max-width: 1200px;
		max-height: 900px;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 20px 24px;
		border-bottom: 1px solid var(--border);
		background: var(--bg);
	}

	.modal-title h2 {
		margin: 0;
		font-size: 20px;
		color: var(--fg);
	}

`	.analysis-badge {
		font-size: 12px;
		color: var(--muted);
		margin-left: 12px;
	}

	.heuristic {
		font-size: 10px;
		opacity: 0.7;
	}

	.modal-close {
		background: none;
		border: none;
		font-size: 20px;
		cursor: pointer;
		color: var(--muted);
		padding: 8px;
		border-radius: 6px;
	}

	.modal-close:hover {
		background: var(--accent);
		color: var(--fg);
	}

	.modal-content {
		flex: 1;
		padding: 24px;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 24px;
	}

	.waveform-section {
		background: var(--bg);
		border: 1px solid var(--border);
		border-radius: 12px;
		padding: 16px;
	}

	.transport-section {
		background: var(--bg);
		border: 1px solid var(--border);
		border-radius: 12px;
		padding: 16px;
	}

	.time-display {
		font-family: monospace;
		font-size: 14px;
		color: var(--muted);
		margin-left: 16px;
	}

	.player-status {
		background: var(--accent);
		border: 1px solid var(--border);
		border-radius: 8px;
		padding: 12px 16px;
		margin: 8px;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
</style>

