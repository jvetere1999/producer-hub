<!--
  Info Base Component

  Local knowledge base for music production and sound design notes.
  Features:
  - Create, edit, delete entries
  - Search and filter by tags/categories
  - Quick templates for common note types
  - Export/import with obfuscation

  @component
-->
<script lang="ts">
    import { onMount } from 'svelte';
    import {
        loadInfoBase,
        saveInfoBase,
        upsertNote,
        deleteNote,
        listNotes,
        getAllTags
    } from '$lib/infobase/storage';
    import { exportInfoBase, importInfoBase } from '$lib/infobase/obfuscate';
    import {
        NOTE_TEMPLATES,
        NOTE_CATEGORIES,
        type InfoBaseState,
        type KnowledgeNote,
        type NoteCategory,
        type NoteTemplate
    } from '$lib/infobase/types';

    // State
    let state: InfoBaseState = { version: 1, entries: {}, order: [] };
    let filteredNotes: KnowledgeNote[] = [];
    let allTags: string[] = [];

    // Filters
    let searchQuery = '';
    let selectedTag = '';
    let selectedCategory = '';
    let sortBy: 'updatedAt' | 'title' = 'updatedAt';

    // Editor state
    let isEditing = false;
    let editingNote: KnowledgeNote | null = null;
    let editTitle = '';
    let editBody = '';
    let editTags = '';
    let editCategory: NoteCategory | '' = '';

    // UI state
    let showTemplates = false;
    let confirmDeleteId: string | null = null;
    let importError = '';

    onMount(() => {
        state = loadInfoBase();
        updateFilteredNotes();
    });

    function updateFilteredNotes() {
        filteredNotes = listNotes(state, {
            query: searchQuery,
            tag: selectedTag,
            category: selectedCategory,
            sortBy
        });
        allTags = getAllTags(state);
    }

    $: if (state) {
        updateFilteredNotes();
    }

    $: {
        // Reactive update on filter changes
        void searchQuery;
        void selectedTag;
        void selectedCategory;
        void sortBy;
        updateFilteredNotes();
    }

    function startNewNote() {
        editingNote = null;
        editTitle = '';
        editBody = '';
        editTags = '';
        editCategory = '';
        isEditing = true;
        showTemplates = false;
    }

    function startFromTemplate(template: NoteTemplate) {
        editingNote = null;
        editTitle = template.title;
        editBody = template.body;
        editTags = template.tags.join(', ');
        editCategory = template.category;
        isEditing = true;
        showTemplates = false;
    }

    function startEdit(note: KnowledgeNote) {
        editingNote = note;
        editTitle = note.title;
        editBody = note.body;
        editTags = note.tags.join(', ');
        editCategory = note.category || '';
        isEditing = true;
    }

    function cancelEdit() {
        isEditing = false;
        editingNote = null;
    }

    function saveEdit() {
        if (!editTitle.trim()) return;

        const tags = editTags
            .split(',')
            .map(t => t.trim())
            .filter(Boolean);

        state = upsertNote(state, {
            id: editingNote?.id,
            title: editTitle.trim(),
            body: editBody,
            tags,
            category: editCategory || undefined
        });

        saveInfoBase(state);
        isEditing = false;
        editingNote = null;
        updateFilteredNotes();
    }

    function confirmDelete(id: string) {
        confirmDeleteId = id;
    }

    function cancelDelete() {
        confirmDeleteId = null;
    }

    function doDelete() {
        if (confirmDeleteId) {
            state = deleteNote(state, confirmDeleteId);
            saveInfoBase(state);
            confirmDeleteId = null;
            updateFilteredNotes();
        }
    }

    function handleExport() {
        const blob = exportInfoBase(state);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `infobase-export-${new Date().toISOString().slice(0, 10)}.md`;
        a.click();
        URL.revokeObjectURL(url);
    }

    async function handleImport(event: Event) {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) return;

        importError = '';

        try {
            const content = await file.text();
            state = importInfoBase(content, state);
            saveInfoBase(state);
            updateFilteredNotes();
        } catch (e) {
            importError = e instanceof Error ? e.message : 'Import failed';
        }

        // Reset input
        input.value = '';
    }

    function formatDate(iso: string): string {
        return new Date(iso).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    }
</script>

<div class="infobase">
    <div class="infobase-header">
        <h2>Info Base</h2>
        <p class="subtitle">Your local knowledge base for music production</p>
    </div>

    {#if isEditing}
        <!-- Editor View -->
        <div class="editor">
            <div class="editor-header">
                <h3>{editingNote ? 'Edit Note' : 'New Note'}</h3>
                <button class="btn-secondary" on:click={cancelEdit}>Cancel</button>
            </div>

            <div class="editor-form">
                <input
                    type="text"
                    class="input-title"
                    placeholder="Note title..."
                    bind:value={editTitle}
                />

                <div class="form-row">
                    <select bind:value={editCategory}>
                        <option value="">No category</option>
                        {#each NOTE_CATEGORIES as cat}
                            <option value={cat}>{cat}</option>
                        {/each}
                    </select>

                    <input
                        type="text"
                        placeholder="Tags (comma-separated)"
                        bind:value={editTags}
                    />
                </div>

                <textarea
                    class="input-body"
                    placeholder="Write your notes here... (Markdown supported)"
                    bind:value={editBody}
                    rows="15"
                ></textarea>

                <div class="editor-actions">
                    <button class="btn-primary" on:click={saveEdit} disabled={!editTitle.trim()}>
                        Save Note
                    </button>
                </div>
            </div>
        </div>
    {:else}
        <!-- List View -->
        <div class="toolbar">
            <button class="btn-primary" on:click={startNewNote}>+ New Note</button>
            <button class="btn-secondary" on:click={() => showTemplates = !showTemplates}>
                Templates
            </button>
            <div class="toolbar-spacer"></div>
            <button class="btn-secondary" on:click={handleExport}>Export</button>
            <label class="btn-secondary import-btn">
                Import
                <input type="file" accept=".md,.txt" on:change={handleImport} hidden />
            </label>
        </div>

        {#if showTemplates}
            <div class="templates">
                <h4>Quick Templates</h4>
                <div class="template-grid">
                    {#each NOTE_TEMPLATES as template}
                        <button class="template-btn" on:click={() => startFromTemplate(template)}>
                            <span class="template-name">{template.name}</span>
                            <span class="template-category">{template.category}</span>
                        </button>
                    {/each}
                </div>
            </div>
        {/if}

        {#if importError}
            <div class="error-msg">{importError}</div>
        {/if}

        <div class="filters">
            <input
                type="text"
                placeholder="Search notes..."
                bind:value={searchQuery}
            />

            <select bind:value={selectedCategory}>
                <option value="">All categories</option>
                {#each NOTE_CATEGORIES as cat}
                    <option value={cat}>{cat}</option>
                {/each}
            </select>

            <select bind:value={selectedTag}>
                <option value="">All tags</option>
                {#each allTags as tag}
                    <option value={tag}>{tag}</option>
                {/each}
            </select>

            <select bind:value={sortBy}>
                <option value="updatedAt">Recent first</option>
                <option value="title">Title A-Z</option>
            </select>
        </div>

        <div class="notes-list">
            {#if filteredNotes.length === 0}
                <div class="empty-state">
                    <p>No notes yet. Create one to get started!</p>
                </div>
            {:else}
                {#each filteredNotes as note (note.id)}
                    <div class="note-card">
                        <div class="note-header">
                            <button type="button" class="note-title" on:click={() => startEdit(note)}>
                                {note.title}
                            </button>
                            <div class="note-meta">
                                {#if note.category}
                                    <span class="note-category">{note.category}</span>
                                {/if}
                                <span class="note-date">{formatDate(note.updatedAt)}</span>
                            </div>
                        </div>

                        {#if note.tags.length > 0}
                            <div class="note-tags">
                                {#each note.tags as tag}
                                    <span class="tag">{tag}</span>
                                {/each}
                            </div>
                        {/if}

                        <p class="note-preview">
                            {note.body.slice(0, 150)}{note.body.length > 150 ? '...' : ''}
                        </p>

                        <div class="note-actions">
                            <button class="btn-small" on:click={() => startEdit(note)}>Edit</button>
                            {#if confirmDeleteId === note.id}
                                <span class="confirm-delete">
                                    Delete?
                                    <button class="btn-small btn-danger" on:click={doDelete}>Yes</button>
                                    <button class="btn-small" on:click={cancelDelete}>No</button>
                                </span>
                            {:else}
                                <button class="btn-small btn-danger" on:click={() => confirmDelete(note.id)}>
                                    Delete
                                </button>
                            {/if}
                        </div>
                    </div>
                {/each}
            {/if}
        </div>
    {/if}
</div>

<style>
    .infobase {
        margin-top: 24px;
        padding-top: 24px;
        border-top: 1px solid var(--border);
    }

    .infobase-header {
        margin-bottom: 16px;
    }

    .infobase-header h2 {
        margin: 0;
        font-size: 18px;
    }

    .subtitle {
        margin: 4px 0 0;
        color: var(--muted);
        font-size: 12px;
    }

    .toolbar {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        margin-bottom: 12px;
    }

    .toolbar-spacer {
        flex: 1;
    }

    .btn-primary, .btn-secondary {
        padding: 8px 14px;
        border-radius: 8px;
        border: 1px solid var(--border);
        cursor: pointer;
        font-size: 13px;
    }

    .btn-primary {
        background: var(--fg);
        color: var(--bg);
        border-color: var(--fg);
    }

    .btn-secondary {
        background: transparent;
        color: var(--fg);
    }

    .import-btn {
        cursor: pointer;
    }

    .templates {
        background: var(--card);
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 16px;
        margin-bottom: 16px;
    }

    .templates h4 {
        margin: 0 0 12px;
        font-size: 14px;
    }

    .template-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
        gap: 8px;
    }

    .template-btn {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        padding: 10px;
        border: 1px solid var(--border);
        border-radius: 8px;
        background: transparent;
        cursor: pointer;
        text-align: left;
    }

    .template-btn:hover {
        background: var(--accent);
    }

    .template-name {
        font-weight: 500;
        font-size: 13px;
    }

    .template-category {
        font-size: 11px;
        color: var(--muted);
        margin-top: 2px;
    }

    .error-msg {
        background: rgba(239, 68, 68, 0.1);
        border: 1px solid rgba(239, 68, 68, 0.3);
        color: rgb(239, 68, 68);
        padding: 10px;
        border-radius: 8px;
        margin-bottom: 12px;
        font-size: 13px;
    }

    .filters {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        margin-bottom: 16px;
    }

    .filters input,
    .filters select {
        padding: 8px 12px;
        border-radius: 8px;
        border: 1px solid var(--border);
        background: transparent;
        color: inherit;
        font-size: 13px;
    }

    .filters input {
        flex: 1;
        min-width: 200px;
    }

    .notes-list {
        display: grid;
        gap: 12px;
    }

    .note-card {
        background: var(--card);
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 14px;
    }

    .note-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 12px;
        margin-bottom: 8px;
    }

    .note-title {
        margin: 0;
        font-size: 15px;
        font-weight: 600;
        cursor: pointer;
        background: none;
        border: none;
        padding: 0;
        color: var(--fg);
        text-align: left;
    }

    .note-title:hover {
        color: rgb(59, 130, 246);
    }

    .note-meta {
        display: flex;
        gap: 8px;
        align-items: center;
        flex-shrink: 0;
    }

    .note-category {
        font-size: 11px;
        padding: 2px 8px;
        border-radius: 999px;
        background: rgba(168, 85, 247, 0.12);
        color: rgb(168, 85, 247);
    }

    .note-date {
        font-size: 11px;
        color: var(--muted);
    }

    .note-tags {
        display: flex;
        gap: 4px;
        flex-wrap: wrap;
        margin-bottom: 8px;
    }

    .tag {
        font-size: 10px;
        padding: 2px 6px;
        border-radius: 999px;
        background: var(--accent);
        border: 1px solid var(--border);
    }

    .note-preview {
        font-size: 13px;
        color: var(--muted);
        margin: 0 0 10px;
        line-height: 1.5;
    }

    .note-actions {
        display: flex;
        gap: 8px;
    }

    .btn-small {
        padding: 4px 10px;
        border-radius: 6px;
        border: 1px solid var(--border);
        background: transparent;
        color: var(--fg);
        font-size: 12px;
        cursor: pointer;
    }

    .btn-danger {
        border-color: rgba(239, 68, 68, 0.3);
        color: rgb(239, 68, 68);
    }

    .confirm-delete {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        color: rgb(239, 68, 68);
    }

    .empty-state {
        text-align: center;
        padding: 40px;
        color: var(--muted);
    }

    /* Editor */
    .editor {
        background: var(--card);
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 16px;
    }

    .editor-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
    }

    .editor-header h3 {
        margin: 0;
        font-size: 16px;
    }

    .editor-form {
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    .input-title {
        padding: 12px;
        border-radius: 8px;
        border: 1px solid var(--border);
        background: transparent;
        color: inherit;
        font-size: 16px;
        font-weight: 500;
    }

    .form-row {
        display: flex;
        gap: 8px;
    }

    .form-row select,
    .form-row input {
        flex: 1;
        padding: 10px;
        border-radius: 8px;
        border: 1px solid var(--border);
        background: transparent;
        color: inherit;
        font-size: 13px;
    }

    .input-body {
        padding: 12px;
        border-radius: 8px;
        border: 1px solid var(--border);
        background: transparent;
        color: inherit;
        font-size: 13px;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        resize: vertical;
        min-height: 200px;
    }

    .editor-actions {
        display: flex;
        justify-content: flex-end;
    }
</style>

