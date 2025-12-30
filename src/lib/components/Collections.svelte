<!--
  Collections Component

  Moodboards and collections for cross-linking entities.
  Supports cover images, item ordering, and markdown export.

  @component
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { EmptyState } from '$lib/components/ui';
	import {
		loadCollections,
		saveCollections,
		createCollection,
		updateCollection,
		deleteCollection,
		listCollections,
		getCollection,
		addCollectionItem,
		removeCollectionItem,
		reorderCollectionItems,
		exportCollectionToMarkdown,
		loadProjects,
		loadReferences,
		storeImageBlob,
		getImageBlobUrl,
		deleteBlob,
		encodeBase64,
		decodeBase64,
		generateId,
		type CollectionsState,
		type Collection,
		type CollectionItem,
		type CollectionRefType,
		type Project,
		type ReferenceTrack
	} from '$lib/hub';
	import { loadInfoBase, listNotes } from '$lib/infobase/storage';

	// State
	let state: CollectionsState = { version: 1, collections: {}, order: [] };
	let collections: Collection[] = [];
	let selectedId: string | null = null;
	let selectedCollection: Collection | null = null;

	// Available items for adding
	let projects: Project[] = [];
	let tracks: ReferenceTrack[] = [];
	let notes: { id: string; name: string }[] = [];

	// UI state
	let isCreating = false;
	let newName = '';
	let editName = '';
	let editDescription = '';
	let showAddItem = false;
	let addItemType: CollectionRefType = 'project';
	let addItemId = '';
	let addItemNote = '';

	// Item popup state
	let showItemPopup = false;
	let selectedItemForPopup: CollectionItem | null = null;
	let itemPopupData: { name: string; type: string; refType: CollectionRefType } | null = null;
	let isAnalyzingItem = false;

	// Cover image
	let coverUrl: string | null = null;

	onMount(() => {
		state = loadCollections();
		collections = listCollections(state);
		loadAvailableItems();
	});

	function loadAvailableItems() {
		const projectsState = loadProjects();
		projects = Object.values(projectsState.projects);

		const refsState = loadReferences();
		tracks = Object.values(refsState.libraries).flatMap(lib => lib.tracks);

		const infobaseState = loadInfoBase();
		notes = listNotes(infobaseState, {}).map(n => ({ id: n.id, name: n.title }));
	}

	function refreshCollections() {
		collections = listCollections(state);
		if (selectedId) {
			selectedCollection = getCollection(state, selectedId) || null;
			if (selectedCollection) {
				loadCoverImage();
			}
		}
	}

	$: {
		void state;
		refreshCollections();
	}

	async function loadCoverImage() {
		if (selectedCollection?.coverImageBlobId) {
			coverUrl = await getImageBlobUrl(selectedCollection.coverImageBlobId);
		} else {
			coverUrl = null;
		}
	}

	function selectCollection(id: string) {
		selectedId = id;
		selectedCollection = getCollection(state, id) || null;
		if (selectedCollection) {
			editName = selectedCollection.name;
			editDescription = decodeBase64(selectedCollection.descriptionEncoded || '');
			loadCoverImage();
		}
	}

	function startCreate() {
		isCreating = true;
		newName = '';
	}

	function handleCreate() {
		if (!newName.trim()) return;

		const result = createCollection(state, { name: newName.trim() });
		state = result.state;
		saveCollections(state);
		isCreating = false;
		selectCollection(result.collection.id);
	}

	function handleSave() {
		if (!selectedId || !editName.trim()) return;

		state = updateCollection(state, selectedId, {
			name: editName.trim(),
			descriptionEncoded: encodeBase64(editDescription)
		});
		saveCollections(state);
	}

	function handleDelete() {
		if (!selectedId) return;
		if (!confirm('Delete this collection?')) return;

		// Delete cover image if exists
		if (selectedCollection?.coverImageBlobId) {
			deleteBlob(selectedCollection.coverImageBlobId).catch(console.error);
		}

		state = deleteCollection(state, selectedId);
		saveCollections(state);
		selectedId = null;
		selectedCollection = null;
	}

	function handleExport() {
		if (!selectedCollection) return;

		const md = exportCollectionToMarkdown(selectedCollection);
		const blob = new Blob([md], { type: 'text/markdown' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `${selectedCollection.name.replace(/[^a-z0-9]/gi, '-')}.md`;
		a.click();
		URL.revokeObjectURL(url);
	}

	async function handleCoverUpload(e: Event) {
		if (!selectedId) return;

		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		// Delete old cover if exists
		if (selectedCollection?.coverImageBlobId) {
			await deleteBlob(selectedCollection.coverImageBlobId);
		}

		const blobId = generateId();
		await storeImageBlob(blobId, file);

		state = updateCollection(state, selectedId, { coverImageBlobId: blobId });
		saveCollections(state);

		input.value = '';
	}

	function openAddItem() {
		showAddItem = true;
		addItemType = 'project';
		addItemId = '';
		addItemNote = '';
	}

	function handleAddItem() {
		if (!selectedId || !addItemId) return;

		state = addCollectionItem(state, selectedId, {
			refType: addItemType,
			refId: addItemId,
			noteEncoded: addItemNote ? encodeBase64(addItemNote) : undefined
		});
		saveCollections(state);
		showAddItem = false;
	}

	function handleRemoveItem(itemId: string) {
		if (!selectedId) return;

		state = removeCollectionItem(state, selectedId, itemId);
		saveCollections(state);
	}

	function moveItem(itemId: string, direction: 'up' | 'down') {
		if (!selectedId || !selectedCollection) return;

		const items = [...selectedCollection.items];
		const index = items.findIndex(i => i.id === itemId);
		if (index < 0) return;

		const newIndex = direction === 'up' ? index - 1 : index + 1;
		if (newIndex < 0 || newIndex >= items.length) return;

		[items[index], items[newIndex]] = [items[newIndex], items[index]];

		const newOrder = items.map(i => i.id);
		state = reorderCollectionItems(state, selectedId, newOrder);
		saveCollections(state);
	}

	function getItemName(item: CollectionItem): string {
		switch (item.refType) {
			case 'project':
				return projects.find(p => p.id === item.refId)?.name || item.refId;
			case 'referenceTrack':
				return tracks.find(t => t.id === item.refId)?.name || item.refId;
			case 'infobaseNote':
				return notes.find(n => n.id === item.refId)?.name || item.refId;
			default:
				return item.refId;
		}
	}

	function handleItemClick(item: CollectionItem) {
		selectedItemForPopup = item;
		itemPopupData = {
			name: getItemName(item),
			type: item.refType,
			refType: item.refType
		};
		showItemPopup = true;
		isAnalyzingItem = true;

		// Auto-trigger analysis/load for reference tracks
		if (item.refType === 'referenceTrack') {
			// Analysis will be shown in popup
			setTimeout(() => {
				isAnalyzingItem = false;
			}, 500);
		} else {
			isAnalyzingItem = false;
		}
	}

	function closeItemPopup() {
		showItemPopup = false;
		selectedItemForPopup = null;
		itemPopupData = null;
	}

	function getItemIcon(type: CollectionRefType): string {
		switch (type) {
			case 'project': return '◉';
			case 'referenceTrack': return '◈';
			case 'infobaseNote': return '⊞';
			case 'shortcut': return '⌨';
			case 'feature': return '✦';
			default: return '◦';
		}
	}

	function getAvailableItems(type: CollectionRefType): { id: string; name: string }[] {
		switch (type) {
			case 'project':
				return projects.map(p => ({ id: p.id, name: p.name }));
			case 'referenceTrack':
				return tracks.map(t => ({ id: t.id, name: t.name }));
			case 'infobaseNote':
				return notes;
			default:
				return [];
		}
	}
</script>

<div class="collections">
	<!-- Sidebar -->
	<div class="sidebar">
		<div class="sidebar-header">
			<h2>Collections</h2>
			<button class="btn btn-primary btn-small" onclick={startCreate}>+ New</button>
		</div>

		{#if isCreating}
			<div class="create-form">
				<input
					type="text"
					bind:value={newName}
					placeholder="Collection name..."
					class="input"
					onkeydown={(e) => e.key === 'Enter' && handleCreate()}
				/>
				<div class="create-actions">
					<button class="btn btn-small btn-primary" onclick={handleCreate}>Create</button>
					<button class="btn btn-small btn-ghost" onclick={() => isCreating = false}>Cancel</button>
				</div>
			</div>
		{/if}

		<div class="collection-list">
			{#if collections.length === 0}
				<EmptyState
					icon="📚"
					title="No collections yet"
					body="Create a collection to organize your favorite items"
				/>
			{:else}
				{#each collections as collection (collection.id)}
					<button
						class="collection-item"
						class:selected={collection.id === selectedId}
						onclick={() => selectCollection(collection.id)}
					>
						<span class="collection-name">{collection.name}</span>
						<span class="collection-count">{collection.items.length} items</span>
					</button>
				{/each}
			{/if}
		</div>
	</div>

	<!-- Main -->
	<div class="main">
		{#if selectedCollection}
			<div class="collection-header">
				<input
					type="text"
					bind:value={editName}
					class="title-input"
					onblur={handleSave}
				/>
				<div class="header-actions">
					<button class="btn btn-small" onclick={handleExport}>Export MD</button>
					<button class="btn btn-small btn-danger" onclick={handleDelete}>Delete</button>
				</div>
			</div>

			<!-- Cover Image -->
			<div class="cover-section">
				{#if coverUrl}
					<div class="cover-preview">
						<img src={coverUrl} alt="Cover" class="cover-image" />
					</div>
				{/if}
				<label class="cover-upload">
					<input type="file" accept="image/*" onchange={handleCoverUpload} hidden />
					<span class="btn btn-small">{coverUrl ? 'Change Cover' : 'Add Cover Image'}</span>
				</label>
			</div>

			<!-- Description -->
			<div class="field">
				<label for="collection-description">Description</label>
				<textarea
					id="collection-description"
					bind:value={editDescription}
					class="textarea"
					rows="3"
					placeholder="Collection description..."
					onblur={handleSave}
				></textarea>
			</div>

			<!-- Items -->
			<div class="items-section">
				<div class="section-header">
					<h3>Items</h3>
					<button class="btn btn-small" onclick={openAddItem}>+ Add Item</button>
				</div>

				{#if selectedCollection.items.length === 0}
					<EmptyState
						icon="✨"
						title="No items yet"
						body="Add items from projects, references, or shortcuts"
					/>
				{:else}
					<div class="items-grid">
						{#each selectedCollection.items as item, index (item.id)}
							<div
								class="item-card"
								role="button"
								tabindex="0"
								onclick={() => handleItemClick(item)}
								onkeydown={(e) => e.key === 'Enter' || e.key === ' ' ? handleItemClick(item) : null}
							>
								<div class="item-icon">{getItemIcon(item.refType)}</div>
								<div class="item-info">
									<span class="item-type">{item.refType}</span>
									<span class="item-name">{getItemName(item)}</span>
									{#if item.noteEncoded}
										<span class="item-note">{decodeBase64(item.noteEncoded)}</span>
									{/if}
								</div>
								<div class="item-actions">
									<button
										class="btn-icon"
										disabled={index === 0}
										onclick={() => moveItem(item.id, 'up')}
									>↑</button>
									<button
										class="btn-icon"
										disabled={index === selectedCollection.items.length - 1}
										onclick={() => moveItem(item.id, 'down')}
									>↓</button>
									<button
										class="btn-icon"
										onclick={() => handleRemoveItem(item.id)}
									>×</button>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		{:else}
			<div class="empty-state">
				<p>Select a collection or create a new one</p>
			</div>
		{/if}
	</div>

	<!-- Add Item Modal -->
	{#if showAddItem}
		<div class="modal-backdrop" onclick={() => showAddItem = false} role="presentation">
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<div class="modal" onclick={(e) => e.stopPropagation()}>
				<h3>Add Item</h3>

				<div class="field">
					<label for="add-item-type">Type</label>
					<select id="add-item-type" bind:value={addItemType} class="input">
						<option value="project">Project</option>
						<option value="referenceTrack">Reference Track</option>
						<option value="infobaseNote">Info Base Note</option>
					</select>
				</div>

				<div class="field">
					<label for="add-item-id">Item</label>
					<select id="add-item-id" bind:value={addItemId} class="input">
						<option value="">Select an item...</option>
						{#each getAvailableItems(addItemType) as item}
							<option value={item.id}>{item.name}</option>
						{/each}
					</select>
				</div>

				<div class="field">
					<label for="add-item-note">Note (optional)</label>
					<input
						id="add-item-note"
						type="text"
						bind:value={addItemNote}
						class="input"
						placeholder="Why did you add this?"
					/>
				</div>

				<div class="modal-actions">
					<button class="btn btn-primary" onclick={handleAddItem} disabled={!addItemId}>Add</button>
					<button class="btn btn-ghost" onclick={() => showAddItem = false}>Cancel</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Item Popup Panel -->
	{#if showItemPopup && itemPopupData}
		<div class="item-popup">
			<div class="popup-header">
				<div class="popup-title">
					<span class="popup-icon">{getItemIcon(itemPopupData.refType)}</span>
					<div class="popup-info">
						<div class="popup-name">{itemPopupData.name}</div>
						<div class="popup-type">{itemPopupData.refType}</div>
					</div>
				</div>
				<button class="popup-close" onclick={closeItemPopup}>✕</button>
			</div>

			<div class="popup-content">
				{#if isAnalyzingItem}
					<div class="analyzing">
						<div class="spinner"></div>
						<p>Loading analysis...</p>
					</div>
				{:else}
					<div class="popup-details">
						<p class="detail-text">
							{#if itemPopupData.refType === 'referenceTrack'}
								Reference track loaded. Use the main References tab for playback and detailed analysis.
							{:else if itemPopupData.refType === 'project'}
								Project: {itemPopupData.name}
							{:else if itemPopupData.refType === 'infobaseNote'}
								Note: {itemPopupData.name}
							{:else}
								{itemPopupData.type}: {itemPopupData.name}
							{/if}
						</p>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>

<style>
	.collections {
		display: flex;
		height: 100%;
		min-height: 500px;
		overflow: auto;
	}

	.sidebar {
		width: 240px;
		min-width: 240px;
		border-right: 1px solid var(--border);
		display: flex;
		flex-direction: column;
		overflow: hidden;
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
		overflow: hidden;
		min-width: 0;
	}

	.create-actions {
		display: flex;
		gap: 8px;
		margin-top: 8px;
	}

	.collection-list {
		flex: 1;
		overflow-y: auto;
		padding: 8px;
	}

	.collection-item {
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

	.collection-item:hover {
		background: var(--accent);
	}

	.collection-item.selected {
		background: var(--accent);
		border: 1px solid var(--border);
	}

	.collection-name {
		font-size: 14px;
		font-weight: 500;
	}

	.collection-count {
		font-size: 11px;
		color: var(--muted);
	}

	.main {
		flex: 1;
		padding: 16px;
		overflow-y: auto;
	}

	.collection-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 16px;
	}

	.title-input {
		font-size: 20px;
		font-weight: 600;
		background: transparent;
		border: none;
		color: var(--fg);
		flex: 1;
		padding: 0;
		box-sizing: border-box;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 100%;
	}

	.title-input:focus {
		outline: none;
		background: var(--accent);
		padding: 4px 8px;
		margin: -4px -8px;
		border-radius: 4px;
	}

	.header-actions {
		display: flex;
		gap: 8px;
	}

	.cover-section {
		margin-bottom: 16px;
	}

	.cover-preview {
		margin-bottom: 8px;
	}

	.cover-image {
		max-width: 100%;
		max-height: 200px;
		border-radius: 8px;
		object-fit: cover;
	}

	.cover-upload {
		cursor: pointer;
	}

	.field {
		margin-bottom: 16px;
	}

	.field label {
		display: block;
		font-size: 12px;
		font-weight: 600;
		color: var(--muted);
		margin-bottom: 6px;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.input,
	.textarea {
		width: 100%;
		max-width: 100%;
		padding: 10px 12px;
		background: var(--bg);
		border: 1px solid var(--border);
		border-radius: 6px;
		color: var(--fg);
		font-size: 14px;
		box-sizing: border-box;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.textarea {
		resize: vertical;
		font-family: inherit;
	}

	.items-section {
		margin-top: 24px;
	}

	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 12px;
	}

	.section-header h3 {
		margin: 0;
		font-size: 14px;
		font-weight: 600;
	}

	.items-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 12px;
	}

	.item-card {
		display: flex;
		align-items: flex-start;
		gap: 12px;
		padding: 12px;
		background: var(--card);
		border: 1px solid var(--border);
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.item-card:hover {
		background: var(--accent);
		border-color: var(--primary);
	}

	.item-card:focus {
		outline: 2px solid var(--primary);
		outline-offset: 2px;
	}

	.item-icon {
		font-size: 24px;
		flex-shrink: 0;
	}

	.item-info {
		flex: 1;
		min-width: 0;
	}

	.item-type {
		display: block;
		font-size: 10px;
		text-transform: uppercase;
		color: var(--muted);
		letter-spacing: 0.05em;
	}

	.item-name {
		display: block;
		font-size: 14px;
		font-weight: 500;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.item-note {
		display: block;
		font-size: 12px;
		color: var(--muted);
		margin-top: 4px;
	}

	.item-actions {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.empty {
		padding: 24px;
		text-align: center;
		color: var(--muted);
		font-size: 13px;
	}

	.empty-state {
		height: 100%;
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
		padding: 2px 6px;
		color: var(--muted);
		font-size: 14px;
	}

	.btn-icon:hover:not(:disabled) {
		color: var(--fg);
	}

	.btn-icon:disabled {
		opacity: 0.3;
		cursor: not-allowed;
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

	.modal-actions {
		display: flex;
		gap: 8px;
		justify-content: flex-end;
		margin-top: 16px;
	}

	.item-popup {
		position: fixed;
		top: 20px;
		left: 50%;
		transform: translateX(-50%);
		background: var(--card);
		border: 1px solid var(--border);
		border-radius: 12px;
		box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
		z-index: 2000;
		max-width: 500px;
		width: calc(100% - 40px);
		animation: slideDown 0.3s ease-out;
	}

	@keyframes slideDown {
		from {
			opacity: 0;
			transform: translateX(-50%) translateY(-20px);
		}
		to {
			opacity: 1;
			transform: translateX(-50%) translateY(0);
		}
	}

	.popup-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 16px;
		border-bottom: 1px solid var(--border);
	}

	.popup-title {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.popup-icon {
		font-size: 24px;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		background: var(--muted);
		border-radius: 8px;
	}

	.popup-info {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.popup-name {
		font-weight: 600;
		font-size: 14px;
		color: var(--fg);
	}

	.popup-type {
		font-size: 12px;
		color: var(--muted);
		text-transform: capitalize;
	}

	.popup-close {
		background: none;
		border: none;
		color: var(--muted);
		font-size: 20px;
		cursor: pointer;
		padding: 0;
		width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.popup-close:hover {
		color: var(--fg);
	}

	.popup-content {
		padding: 16px;
		min-height: 60px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.analyzing {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 12px;
		color: var(--muted);
		font-size: 13px;
	}

	.spinner {
		width: 20px;
		height: 20px;
		border: 2px solid var(--border);
		border-top-color: var(--fg);
		border-radius: 50%;
		animation: spin 0.6s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.popup-details {
		width: 100%;
	}

	.detail-text {
		margin: 0;
		color: var(--fg);
		font-size: 13px;
		line-height: 1.5;
	}

	/* Mobile responsive improvements for text fields */
	@media (max-width: 768px) {
		.sidebar {
			width: 200px;
			min-width: 200px;
		}

		.title-input {
			font-size: 18px;
		}

		.input,
		.textarea {
			font-size: 16px; /* Prevents zoom on iOS */
		}

		.items-grid {
			grid-template-columns: 1fr;
		}

		.item-card {
			flex-wrap: wrap;
		}

		.item-actions {
			flex-direction: row;
			margin-top: 8px;
		}
	}

	@media (max-width: 480px) {
		.collections {
			flex-direction: column;
		}

		.sidebar {
			width: 100%;
			min-width: 100%;
			max-height: 200px;
		}

		.main {
			flex: 1;
			min-height: 300px;
		}

		.collection-header {
			flex-direction: column;
			align-items: flex-start;
			gap: 12px;
		}

		.title-input {
			width: 100%;
		}
	}
</style>

