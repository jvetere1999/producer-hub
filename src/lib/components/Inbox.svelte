<!--
  Inbox Component

  Quick capture for ideas, notes, and tasks.
  Supports promoting items to projects, archiving, and resurfacing stale items.

  @component
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import {
		loadInbox,
		saveInbox,
		addInboxItem as addItem,
		updateInboxItem,
		deleteInboxItem,
		archiveInboxItem,
		restoreInboxItem,
		listInboxItems,
		getStaleInboxItems,
		promoteInboxToProject,
		loadProjects,
		saveProjects,
		encodeBase64,
		decodeBase64,
		type InboxState,
		type InboxItem,
		type InboxKind,
		INBOX_KIND_LABELS
	} from '$lib/hub';

	// State
	let state: InboxState = { version: 1, items: {}, order: [] };
	let activeItems: InboxItem[] = [];
	let staleItems: InboxItem[] = [];

	// Input state
	let newTitle = '';
	let newBody = '';
	let newKind: InboxKind = 'idea';
	let newTags = '';
	let showBody = false;

	// View state
	let showArchived = false;
	let showStale = false;
	let editingId: string | null = null;
	let editTitle = '';
	let editBody = '';
	let promoteId: string | null = null;
	let promoteName = '';

	onMount(() => {
		state = loadInbox();
		refreshLists();
	});

	function refreshLists() {
		activeItems = listInboxItems(state, { includeArchived: showArchived });
		staleItems = getStaleInboxItems(state);
	}

	$: {
		void state;
		void showArchived;
		refreshLists();
	}

	function handleAdd() {
		if (!newTitle.trim()) return;

		const tags = newTags.split(',').map(t => t.trim()).filter(Boolean);

		state = addItem(state, {
			title: newTitle.trim(),
			bodyEncoded: encodeBase64(newBody),
			kind: newKind,
			tags: tags.length > 0 ? tags : undefined
		});

		saveInbox(state);

		// Reset form
		newTitle = '';
		newBody = '';
		newTags = '';
		showBody = false;
	}

	function handleArchive(id: string) {
		state = archiveInboxItem(state, id);
		saveInbox(state);
	}

	function handleRestore(id: string) {
		state = restoreInboxItem(state, id);
		saveInbox(state);
	}

	function handleDelete(id: string) {
		if (confirm('Delete this item permanently?')) {
			state = deleteInboxItem(state, id);
			saveInbox(state);
		}
	}

	function startEdit(item: InboxItem) {
		editingId = item.id;
		editTitle = item.title;
		editBody = decodeBase64(item.bodyEncoded);
	}

	function saveEdit() {
		if (!editingId || !editTitle.trim()) return;

		state = updateInboxItem(state, editingId, {
			title: editTitle.trim(),
			bodyEncoded: encodeBase64(editBody)
		});
		saveInbox(state);
		editingId = null;
	}

	function cancelEdit() {
		editingId = null;
	}

	function startPromote(item: InboxItem) {
		promoteId = item.id;
		promoteName = item.title;
	}

	function doPromote() {
		if (!promoteId || !promoteName.trim()) return;

		let projectsState = loadProjects();
		const result = promoteInboxToProject(state, projectsState, promoteId, promoteName.trim());

		state = result.inboxState;
		saveInbox(state);
		saveProjects(result.projectsState);

		promoteId = null;
		promoteName = '';
	}

	function cancelPromote() {
		promoteId = null;
		promoteName = '';
	}

	function formatDate(iso: string): string {
		return new Date(iso).toLocaleDateString(undefined, {
			month: 'short',
			day: 'numeric'
		});
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey && !showBody) {
			e.preventDefault();
			handleAdd();
		}
	}
</script>

<div class="inbox">
	<div class="inbox-header">
		<h2>Inbox</h2>
		<p class="subtitle">Capture ideas quickly, promote to projects later</p>
	</div>

	<!-- Quick Add Form -->
	<div class="add-form">
		<div class="add-row">
			<input
				type="text"
				bind:value={newTitle}
				placeholder="Quick idea..."
				class="add-input"
				onkeydown={handleKeydown}
			/>
			<select bind:value={newKind} class="kind-select">
				{#each Object.entries(INBOX_KIND_LABELS) as [value, label]}
					<option {value}>{label}</option>
				{/each}
			</select>
			<button class="btn btn-primary" onclick={handleAdd}>Add</button>
		</div>

		<button class="toggle-body" onclick={() => showBody = !showBody}>
			{showBody ? '− Hide details' : '+ Add details'}
		</button>

		{#if showBody}
			<textarea
				bind:value={newBody}
				placeholder="More details..."
				class="add-textarea"
				rows="3"
			></textarea>
			<input
				type="text"
				bind:value={newTags}
				placeholder="Tags (comma separated)"
				class="add-input tags-input"
			/>
		{/if}
	</div>

	<!-- Stale Items Alert -->
	{#if staleItems.length > 0 && !showStale}
		<button class="stale-alert" onclick={() => showStale = true}>
			⚠️ {staleItems.length} item{staleItems.length !== 1 ? 's' : ''} older than 14 days need attention
		</button>
	{/if}

	{#if showStale && staleItems.length > 0}
		<div class="stale-section">
			<div class="section-header">
				<h3>Stale Items</h3>
				<button class="btn-text" onclick={() => showStale = false}>Hide</button>
			</div>
			{#each staleItems as item (item.id)}
				<div class="inbox-item stale">
					<div class="item-content">
						<span class="item-kind">{INBOX_KIND_LABELS[item.kind]}</span>
						<span class="item-title">{item.title}</span>
						<span class="item-date">{formatDate(item.createdAt)}</span>
					</div>
					<div class="item-actions">
						<button class="btn-icon" title="Promote to project" onclick={() => startPromote(item)}>🚀</button>
						<button class="btn-icon" title="Archive" onclick={() => handleArchive(item.id)}>📥</button>
					</div>
				</div>
			{/each}
		</div>
	{/if}

	<!-- Active Items -->
	<div class="items-section">
		<div class="section-header">
			<h3>Items</h3>
			<label class="checkbox-label">
				<input type="checkbox" bind:checked={showArchived} />
				Show archived
			</label>
		</div>

		{#if activeItems.length === 0}
			<div class="empty">No items yet. Add your first idea above!</div>
		{:else}
			{#each activeItems as item (item.id)}
				<div class="inbox-item" class:archived={item.archived} class:promoted={item.promotedProjectId}>
					{#if editingId === item.id}
						<div class="edit-form">
							<input
								type="text"
								bind:value={editTitle}
								class="edit-input"
							/>
							<textarea
								bind:value={editBody}
								class="edit-textarea"
								rows="2"
							></textarea>
							<div class="edit-actions">
								<button class="btn btn-small" onclick={saveEdit}>Save</button>
								<button class="btn btn-small btn-ghost" onclick={cancelEdit}>Cancel</button>
							</div>
						</div>
					{:else}
						<div class="item-content">
							<span class="item-kind">{INBOX_KIND_LABELS[item.kind]}</span>
							<span class="item-title">{item.title}</span>
							{#if item.tags?.length}
								<span class="item-tags">
									{#each item.tags as tag}
										<span class="tag">{tag}</span>
									{/each}
								</span>
							{/if}
							<span class="item-date">{formatDate(item.createdAt)}</span>
							{#if item.promotedProjectId}
								<span class="promoted-badge">→ Project</span>
							{/if}
						</div>
						<div class="item-actions">
							{#if !item.promotedProjectId}
								<button class="btn-icon" title="Promote to project" onclick={() => startPromote(item)}>🚀</button>
							{/if}
							<button class="btn-icon" title="Edit" onclick={() => startEdit(item)}>✏️</button>
							{#if item.archived}
								<button class="btn-icon" title="Restore" onclick={() => handleRestore(item.id)}>↩️</button>
							{:else}
								<button class="btn-icon" title="Archive" onclick={() => handleArchive(item.id)}>📥</button>
							{/if}
							<button class="btn-icon" title="Delete" onclick={() => handleDelete(item.id)}>🗑️</button>
						</div>
					{/if}
				</div>
			{/each}
		{/if}
	</div>

	<!-- Promote Modal -->
	{#if promoteId}
		<div class="modal-backdrop" onclick={cancelPromote} role="presentation">
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<div class="modal" onclick={(e) => e.stopPropagation()}>
				<h3>Promote to Project</h3>
				<input
					type="text"
					bind:value={promoteName}
					placeholder="Project name"
					class="modal-input"
				/>
				<div class="modal-actions">
					<button class="btn btn-primary" onclick={doPromote}>Create Project</button>
					<button class="btn btn-ghost" onclick={cancelPromote}>Cancel</button>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.inbox {
		padding: 16px;
	}

	.inbox-header {
		margin-bottom: 24px;
	}

	.inbox-header h2 {
		margin: 0 0 4px 0;
		font-size: 20px;
	}

	.subtitle {
		margin: 0;
		color: var(--muted);
		font-size: 13px;
	}

	.add-form {
		background: var(--card);
		border: 1px solid var(--border);
		border-radius: 8px;
		padding: 12px;
		margin-bottom: 20px;
	}

	.add-row {
		display: flex;
		gap: 8px;
	}

	.add-input {
		flex: 1;
		padding: 10px 12px;
		background: var(--bg);
		border: 1px solid var(--border);
		border-radius: 6px;
		color: var(--fg);
		font-size: 14px;
	}

	.kind-select {
		padding: 8px 12px;
		background: var(--bg);
		border: 1px solid var(--border);
		border-radius: 6px;
		color: var(--fg);
		font-size: 14px;
	}

	.toggle-body {
		background: none;
		border: none;
		color: var(--muted);
		font-size: 12px;
		cursor: pointer;
		padding: 8px 0 0 0;
	}

	.add-textarea {
		width: 100%;
		margin-top: 8px;
		padding: 10px 12px;
		background: var(--bg);
		border: 1px solid var(--border);
		border-radius: 6px;
		color: var(--fg);
		font-size: 14px;
		resize: vertical;
	}

	.tags-input {
		margin-top: 8px;
		width: 100%;
	}

	.btn {
		padding: 10px 16px;
		border: none;
		border-radius: 6px;
		font-size: 14px;
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
		padding: 6px 12px;
		font-size: 13px;
	}

	.btn-text {
		background: none;
		border: none;
		color: var(--muted);
		cursor: pointer;
		font-size: 12px;
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

	.stale-alert {
		display: block;
		width: 100%;
		padding: 12px;
		background: #fef3c7;
		border: 1px solid #f59e0b;
		border-radius: 6px;
		color: #92400e;
		font-size: 13px;
		cursor: pointer;
		margin-bottom: 16px;
		text-align: left;
	}

	.stale-section {
		background: #fffbeb;
		border: 1px solid #fcd34d;
		border-radius: 8px;
		padding: 12px;
		margin-bottom: 16px;
	}

	:global(html[data-theme='dark']) .stale-section {
		background: #422006;
		border-color: #854d0e;
	}

	.section-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 12px;
	}

	.section-header h3 {
		margin: 0;
		font-size: 14px;
		font-weight: 600;
	}

	.checkbox-label {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 12px;
		color: var(--muted);
		cursor: pointer;
	}

	.items-section {
		margin-top: 16px;
	}

	.empty {
		padding: 32px;
		text-align: center;
		color: var(--muted);
		font-size: 14px;
	}

	.inbox-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 12px;
		background: var(--card);
		border: 1px solid var(--border);
		border-radius: 6px;
		margin-bottom: 8px;
	}

	.inbox-item.archived {
		opacity: 0.6;
	}

	.inbox-item.promoted {
		border-left: 3px solid #10b981;
	}

	.inbox-item.stale {
		background: #fef9c3;
	}

	:global(html[data-theme='dark']) .inbox-item.stale {
		background: #3f3f04;
	}

	.item-content {
		display: flex;
		align-items: center;
		gap: 10px;
		flex: 1;
		min-width: 0;
	}

	.item-kind {
		font-size: 10px;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		padding: 2px 6px;
		background: var(--accent);
		border-radius: 4px;
		color: var(--muted);
	}

	.item-title {
		font-size: 14px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.item-tags {
		display: flex;
		gap: 4px;
	}

	.tag {
		font-size: 11px;
		padding: 2px 6px;
		background: #3b82f6;
		color: white;
		border-radius: 4px;
	}

	.item-date {
		font-size: 11px;
		color: var(--muted);
		white-space: nowrap;
	}

	.promoted-badge {
		font-size: 10px;
		color: #10b981;
		font-weight: 500;
	}

	.item-actions {
		display: flex;
		gap: 4px;
	}

	.edit-form {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.edit-input,
	.edit-textarea {
		padding: 8px 10px;
		background: var(--bg);
		border: 1px solid var(--border);
		border-radius: 4px;
		color: var(--fg);
		font-size: 14px;
	}

	.edit-actions {
		display: flex;
		gap: 8px;
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
</style>

