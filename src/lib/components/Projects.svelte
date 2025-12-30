<!--
  Projects Component

  Split view with projects list and project editor.
  Supports status tracking, notes, checklists, milestones, timeline, and assets.

  @component
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { PageHeader } from '$lib/components/ui';
	import {
		loadProjects,
		saveProjects,
		createProject,
		updateProject,
		deleteProject,
		listProjects,
		getProject,
		addProjectMilestone,
		addProjectChecklistItem,
		exportProjectToMarkdown,
		encodeBase64,
		decodeBase64,
		type ProjectsState,
		type Project,
		type ProjectStatus,
		PROJECT_STATUS_LABELS,
		PROJECT_STATUS_ORDER
	} from '$lib/hub';

	// State
	let state: ProjectsState = { version: 1, projects: {}, order: [] };
	let projects: Project[] = [];
	let selectedId: string | null = null;
	let selectedProject: Project | null = null;

	// Filter
	let statusFilter: ProjectStatus | 'all' = 'all';
	let searchQuery = '';

	// Editor state
	let editName = '';
	let editStatus: ProjectStatus = 'idea';
	let editNotes = '';
	let editTags = '';
	let newChecklistItem = '';
	let newMilestoneTitle = '';
	let newMilestoneDue = '';

	// Create mode
	let isCreating = false;

	onMount(() => {
		state = loadProjects();
		refreshList();
	});

	function refreshList() {
		let list = listProjects(state);

		if (statusFilter !== 'all') {
			list = list.filter(p => p.status === statusFilter);
		}

		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase();
			list = list.filter(p =>
				p.name.toLowerCase().includes(q) ||
				decodeBase64(p.notesEncoded).toLowerCase().includes(q) ||
				(p.tags || []).some(t => t.toLowerCase().includes(q))
			);
		}

		projects = list;

		// Update selected project
		if (selectedId) {
			selectedProject = getProject(state, selectedId) || null;
			if (selectedProject) {
				loadProjectToEditor(selectedProject);
			}
		}
	}

	$: {
		void state;
		void statusFilter;
		void searchQuery;
		refreshList();
	}

	function loadProjectToEditor(project: Project) {
		editName = project.name;
		editStatus = project.status;
		editNotes = decodeBase64(project.notesEncoded);
		editTags = (project.tags || []).join(', ');
	}

	function selectProject(id: string) {
		selectedId = id;
		isCreating = false;
		const project = getProject(state, id);
		if (project) {
			selectedProject = project;
			loadProjectToEditor(project);
		}
	}

	function startCreate() {
		isCreating = true;
		selectedId = null;
		selectedProject = null;
		editName = '';
		editStatus = 'idea';
		editNotes = '';
		editTags = '';
	}

	function handleCreate() {
		if (!editName.trim()) return;

		const tags = editTags.split(',').map(t => t.trim()).filter(Boolean);

		const result = createProject(state, {
			name: editName.trim(),
			status: editStatus,
			notesEncoded: encodeBase64(editNotes),
			tags: tags.length > 0 ? tags : undefined
		});

		state = result.state;
		saveProjects(state);
		isCreating = false;
		selectProject(result.project.id);
	}

	function handleSave() {
		if (!selectedId || !editName.trim()) return;

		const tags = editTags.split(',').map(t => t.trim()).filter(Boolean);

		state = updateProject(state, selectedId, {
			name: editName.trim(),
			status: editStatus,
			notesEncoded: encodeBase64(editNotes),
			tags: tags.length > 0 ? tags : undefined
		});

		saveProjects(state);
		refreshList();
	}

	function handleDelete() {
		if (!selectedId) return;
		if (!confirm('Delete this project permanently?')) return;

		state = deleteProject(state, selectedId);
		saveProjects(state);
		selectedId = null;
		selectedProject = null;
		isCreating = false;
	}

	function handleExport() {
		if (!selectedProject) return;

		const md = exportProjectToMarkdown(selectedProject);
		const blob = new Blob([md], { type: 'text/markdown' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `${selectedProject.name.replace(/[^a-z0-9]/gi, '-')}.md`;
		a.click();
		URL.revokeObjectURL(url);
	}

	function addChecklist() {
		if (!selectedId || !newChecklistItem.trim()) return;

		state = addProjectChecklistItem(state, selectedId, {
			text: newChecklistItem.trim(),
			done: false
		});
		saveProjects(state);
		newChecklistItem = '';
		refreshList();
	}

	function toggleChecklistItem(itemId: string, done: boolean) {
		if (!selectedId || !selectedProject) return;

		const checklist = (selectedProject.checklist || []).map(item =>
			item.id === itemId ? { ...item, done } : item
		);

		state = updateProject(state, selectedId, { checklist });
		saveProjects(state);
		refreshList();
	}

	function removeChecklistItem(itemId: string) {
		if (!selectedId || !selectedProject) return;

		const checklist = (selectedProject.checklist || []).filter(item => item.id !== itemId);
		state = updateProject(state, selectedId, { checklist });
		saveProjects(state);
		refreshList();
	}

	function addMilestone() {
		if (!selectedId || !newMilestoneTitle.trim()) return;

		state = addProjectMilestone(state, selectedId, {
			title: newMilestoneTitle.trim(),
			dueDateISO: newMilestoneDue || undefined,
			done: false
		});
		saveProjects(state);
		newMilestoneTitle = '';
		newMilestoneDue = '';
		refreshList();
	}

	function toggleMilestone(milestoneId: string, done: boolean) {
		if (!selectedId || !selectedProject) return;

		const milestones = (selectedProject.milestones || []).map(m =>
			m.id === milestoneId ? { ...m, done } : m
		);

		state = updateProject(state, selectedId, { milestones }, {
			type: 'milestone',
			summary: done ? `Completed: ${milestones.find(m => m.id === milestoneId)?.title}` : `Reopened milestone`
		});
		saveProjects(state);
		refreshList();
	}

	function formatDate(iso: string): string {
		return new Date(iso).toLocaleDateString(undefined, {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}

	function getStatusColor(status: ProjectStatus): string {
		const colors: Record<ProjectStatus, string> = {
			idea: '#a855f7',
			active: '#3b82f6',
			arrangement: '#06b6d4',
			mix: '#f59e0b',
			master: '#ec4899',
			released: '#10b981',
			archived: '#6b7280'
		};
		return colors[status];
	}
</script>

<div class="projects">
	<!-- Sidebar: Projects List -->
	<div class="sidebar">
		<PageHeader title="Projects" icon="◈" size="sm">
			{#snippet actions()}
				<button class="btn btn-primary btn-small" onclick={startCreate}>+ New</button>
			{/snippet}
		</PageHeader>

		<div class="filters">
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Search projects..."
				class="search-input"
			/>
			<select bind:value={statusFilter} class="status-filter">
				<option value="all">All Status</option>
				{#each PROJECT_STATUS_ORDER as status}
					<option value={status}>{PROJECT_STATUS_LABELS[status]}</option>
				{/each}
			</select>
		</div>

		<div class="project-list">
			{#if projects.length === 0}
				<div class="empty">No projects found</div>
			{:else}
				{#each projects as project (project.id)}
					<button
						class="project-item"
						class:selected={project.id === selectedId}
						onclick={() => selectProject(project.id)}
					>
						<span
							class="status-dot"
							style="background: {getStatusColor(project.status)}"
						></span>
						<div class="project-info">
							<span class="project-name">{project.name}</span>
							<span class="project-meta">
								{PROJECT_STATUS_LABELS[project.status]} · {formatDate(project.updatedAt)}
							</span>
						</div>
					</button>
				{/each}
			{/if}
		</div>
	</div>

	<!-- Main: Project Editor -->
	<div class="editor">
		{#if isCreating}
			<div class="editor-header">
				<h2>New Project</h2>
			</div>

			<div class="editor-content">
				<div class="field">
					<label for="create-name">Name</label>
					<input id="create-name" type="text" bind:value={editName} class="input" placeholder="Project name" />
				</div>

				<div class="field">
					<label for="create-status">Status</label>
					<select id="create-status" bind:value={editStatus} class="input">
						{#each PROJECT_STATUS_ORDER as status}
							<option value={status}>{PROJECT_STATUS_LABELS[status]}</option>
						{/each}
					</select>
				</div>

				<div class="field">
					<label for="create-tags">Tags</label>
					<input id="create-tags" type="text" bind:value={editTags} class="input" placeholder="Tags (comma separated)" />
				</div>

				<div class="field">
					<label for="create-notes">Notes</label>
					<textarea id="create-notes" bind:value={editNotes} class="textarea" rows="6" placeholder="Project notes..."></textarea>
				</div>

				<div class="actions">
					<button class="btn btn-primary" onclick={handleCreate}>Create Project</button>
					<button class="btn btn-ghost" onclick={() => isCreating = false}>Cancel</button>
				</div>
			</div>
		{:else if selectedProject}
			<div class="editor-header">
				<input
					type="text"
					bind:value={editName}
					class="title-input"
					onblur={handleSave}
				/>
				<div class="editor-actions">
					<button class="btn btn-small" onclick={handleExport}>Export MD</button>
					<button class="btn btn-small btn-danger" onclick={handleDelete}>Delete</button>
				</div>
			</div>

			<div class="editor-content">
				<!-- Status & Tags -->
				<div class="row">
					<div class="field flex-1">
						<label for="edit-status">Status</label>
						<select id="edit-status" bind:value={editStatus} class="input" onchange={handleSave}>
							{#each PROJECT_STATUS_ORDER as status}
								<option value={status}>{PROJECT_STATUS_LABELS[status]}</option>
							{/each}
						</select>
					</div>
					<div class="field flex-2">
						<label for="edit-tags">Tags</label>
						<input id="edit-tags" type="text" bind:value={editTags} class="input" onblur={handleSave} />
					</div>
				</div>

				<!-- Notes -->
				<div class="field">
					<label for="edit-notes">Notes</label>
					<textarea id="edit-notes" bind:value={editNotes} class="textarea" rows="8" onblur={handleSave}></textarea>
				</div>

				<!-- Checklist -->
				<div class="section">
					<h3>Checklist</h3>
					<div class="checklist">
						{#each selectedProject.checklist || [] as item (item.id)}
							<div class="checklist-item">
								<input
									type="checkbox"
									checked={item.done}
									onchange={(e) => toggleChecklistItem(item.id, e.currentTarget.checked)}
								/>
								<span class:done={item.done}>{item.text}</span>
								<button class="btn-icon" onclick={() => removeChecklistItem(item.id)}>×</button>
							</div>
						{/each}
						<div class="add-row">
							<input
								type="text"
								bind:value={newChecklistItem}
								placeholder="Add item..."
								class="input flex-1"
								onkeydown={(e) => e.key === 'Enter' && addChecklist()}
							/>
							<button class="btn btn-small" onclick={addChecklist}>Add</button>
						</div>
					</div>
				</div>

				<!-- Milestones -->
				<div class="section">
					<h3>Milestones</h3>
					<div class="milestones">
						{#each selectedProject.milestones || [] as milestone (milestone.id)}
							<div class="milestone-item">
								<input
									type="checkbox"
									checked={milestone.done}
									onchange={(e) => toggleMilestone(milestone.id, e.currentTarget.checked)}
								/>
								<span class:done={milestone.done}>{milestone.title}</span>
								{#if milestone.dueDateISO}
									<span class="due-date">Due: {formatDate(milestone.dueDateISO)}</span>
								{/if}
							</div>
						{/each}
						<div class="add-row">
							<input
								type="text"
								bind:value={newMilestoneTitle}
								placeholder="Milestone title..."
								class="input flex-1"
							/>
							<input
								type="date"
								bind:value={newMilestoneDue}
								class="input date-input"
							/>
							<button class="btn btn-small" onclick={addMilestone}>Add</button>
						</div>
					</div>
				</div>

				<!-- Timeline -->
				{#if selectedProject.timeline?.length}
					<div class="section">
						<h3>Timeline</h3>
						<div class="timeline">
							{#each selectedProject.timeline.slice().reverse() as event (event.id)}
								<div class="timeline-item">
									<span class="timeline-date">{formatDate(event.atISO)}</span>
									<span class="timeline-summary">{event.summary}</span>
								</div>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Meta -->
				<div class="meta">
					Created: {formatDate(selectedProject.createdAt)} · Updated: {formatDate(selectedProject.updatedAt)}
				</div>
			</div>
		{:else}
			<div class="empty-state">
				<p>Select a project or create a new one</p>
			</div>
		{/if}
	</div>
</div>

<style>
	.projects {
		display: flex;
		height: 100%;
		min-height: 500px;
	}

	.sidebar {
		width: 300px;
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
		font-size: 18px;
	}

	.filters {
		padding: 12px;
		display: flex;
		flex-direction: column;
		gap: 8px;
		border-bottom: 1px solid var(--border);
	}

	.search-input,
	.status-filter {
		padding: 8px 12px;
		background: var(--bg);
		border: 1px solid var(--border);
		border-radius: 6px;
		color: var(--fg);
		font-size: 13px;
	}

	.project-list {
		flex: 1;
		overflow-y: auto;
		padding: 8px;
	}

	.project-item {
		display: flex;
		align-items: center;
		gap: 10px;
		width: 100%;
		padding: 10px 12px;
		background: transparent;
		border: none;
		border-radius: 6px;
		cursor: pointer;
		text-align: left;
		color: var(--fg);
	}

	.project-item:hover {
		background: var(--accent);
	}

	.project-item.selected {
		background: var(--accent);
		border: 1px solid var(--border);
	}

	.status-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.project-info {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}

	.project-name {
		font-size: 14px;
		font-weight: 500;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.project-meta {
		font-size: 11px;
		color: var(--muted);
	}

	.editor {
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.editor-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 16px;
		border-bottom: 1px solid var(--border);
	}

	.editor-header h2 {
		margin: 0;
		font-size: 18px;
	}

	.title-input {
		font-size: 20px;
		font-weight: 600;
		background: transparent;
		border: none;
		color: var(--fg);
		flex: 1;
		padding: 0;
	}

	.title-input:focus {
		outline: none;
		background: var(--accent);
		padding: 4px 8px;
		margin: -4px -8px;
		border-radius: 4px;
	}

	.editor-actions {
		display: flex;
		gap: 8px;
	}

	.editor-content {
		flex: 1;
		overflow-y: auto;
		padding: 16px;
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
		padding: 10px 12px;
		background: var(--bg);
		border: 1px solid var(--border);
		border-radius: 6px;
		color: var(--fg);
		font-size: 14px;
	}

	.textarea {
		resize: vertical;
		font-family: inherit;
	}

	.row {
		display: flex;
		gap: 16px;
	}

	.flex-1 { flex: 1; }
	.flex-2 { flex: 2; }

	.section {
		margin-top: 24px;
		padding-top: 24px;
		border-top: 1px solid var(--border);
	}

	.section h3 {
		margin: 0 0 12px 0;
		font-size: 14px;
		font-weight: 600;
	}

	.checklist,
	.milestones {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.checklist-item,
	.milestone-item {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 8px;
		background: var(--card);
		border-radius: 6px;
	}

	.checklist-item span,
	.milestone-item span {
		flex: 1;
	}

	.done {
		text-decoration: line-through;
		color: var(--muted);
	}

	.due-date {
		font-size: 12px;
		color: var(--muted);
	}

	.add-row {
		display: flex;
		gap: 8px;
	}

	.date-input {
		width: 150px;
	}

	.timeline {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.timeline-item {
		display: flex;
		gap: 12px;
		font-size: 13px;
	}

	.timeline-date {
		color: var(--muted);
		min-width: 80px;
	}

	.meta {
		margin-top: 24px;
		padding-top: 16px;
		border-top: 1px solid var(--border);
		font-size: 12px;
		color: var(--muted);
	}

	.empty-state {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--muted);
	}

	.empty {
		padding: 24px;
		text-align: center;
		color: var(--muted);
		font-size: 13px;
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
		font-size: 16px;
	}

	.btn-icon:hover {
		color: var(--fg);
	}

	.actions {
		display: flex;
		gap: 8px;
		margin-top: 16px;
	}
</style>

