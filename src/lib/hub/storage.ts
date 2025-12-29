/**
 * Producer Hub Storage Module
 *
 * Handles localStorage persistence for hub data.
 * Uses versioned migrations and consistent patterns from InfoBase.
 *
 * @module hub/storage
 */

import type {
	InboxState,
	InboxItem,
	ProjectsState,
	Project,
	ReferencesState,
	ReferenceLibrary,
	CollectionsState,
	Collection,
	ProjectEvent,
	ProjectMilestone,
	ProjectChecklistItem
} from './types';
import { generateId, nowISO, encodeBase64, decodeBase64 } from './encoding';

// ============================================
// Storage Keys
// ============================================

const STORAGE_KEYS = {
	inbox: 'hub_inbox_v1',
	projects: 'hub_projects_v1',
	references: 'hub_refs_v1',
	collections: 'hub_collections_v1'
} as const;

const CURRENT_VERSION = 1;

// ============================================
// Empty State Factories
// ============================================

function createEmptyInboxState(): InboxState {
	return { version: CURRENT_VERSION, items: {}, order: [] };
}

function createEmptyProjectsState(): ProjectsState {
	return { version: CURRENT_VERSION, projects: {}, order: [] };
}

function createEmptyReferencesState(): ReferencesState {
	return { version: CURRENT_VERSION, libraries: {}, order: [] };
}

function createEmptyCollectionsState(): CollectionsState {
	return { version: CURRENT_VERSION, collections: {}, order: [] };
}

// ============================================
// Generic Load/Save Helpers
// ============================================

function loadState<T>(key: string, createEmpty: () => T): T {
	if (typeof window === 'undefined') return createEmpty();

	try {
		const raw = localStorage.getItem(key);
		if (!raw) return createEmpty();
		return JSON.parse(raw) as T;
	} catch (e) {
		console.error(`Failed to load ${key}:`, e);
		return createEmpty();
	}
}

function saveState<T>(key: string, state: T): void {
	if (typeof window === 'undefined') return;

	try {
		localStorage.setItem(key, JSON.stringify(state));
	} catch (e) {
		console.error(`Failed to save ${key}:`, e);
	}
}

// ============================================
// Inbox Operations
// ============================================

export function loadInbox(): InboxState {
	return loadState(STORAGE_KEYS.inbox, createEmptyInboxState);
}

export function saveInbox(state: InboxState): void {
	saveState(STORAGE_KEYS.inbox, state);
}

export function addInboxItem(
	state: InboxState,
	item: Omit<InboxItem, 'id' | 'createdAt' | 'updatedAt'>
): InboxState {
	const id = generateId();
	const now = nowISO();

	const newItem: InboxItem = {
		...item,
		id,
		createdAt: now,
		updatedAt: now
	};

	return {
		...state,
		items: { ...state.items, [id]: newItem },
		order: [id, ...state.order]
	};
}

export function updateInboxItem(
	state: InboxState,
	id: string,
	updates: Partial<Omit<InboxItem, 'id' | 'createdAt'>>
): InboxState {
	const item = state.items[id];
	if (!item) return state;

	const updatedItem: InboxItem = {
		...item,
		...updates,
		updatedAt: nowISO()
	};

	return {
		...state,
		items: { ...state.items, [id]: updatedItem }
	};
}

export function deleteInboxItem(state: InboxState, id: string): InboxState {
	const { [id]: _, ...remaining } = state.items;
	return {
		...state,
		items: remaining,
		order: state.order.filter((i) => i !== id)
	};
}

export function archiveInboxItem(state: InboxState, id: string): InboxState {
	return updateInboxItem(state, id, { archived: true });
}

export function restoreInboxItem(state: InboxState, id: string): InboxState {
	return updateInboxItem(state, id, { archived: false });
}

export function listInboxItems(
	state: InboxState,
	options: {
		includeArchived?: boolean;
		includePromoted?: boolean;
	} = {}
): InboxItem[] {
	const { includeArchived = false, includePromoted = false } = options;

	return state.order
		.map((id) => state.items[id])
		.filter(Boolean)
		.filter((item) => {
			if (!includeArchived && item.archived) return false;
			if (!includePromoted && item.promotedProjectId) return false;
			return true;
		});
}

export function getStaleInboxItems(state: InboxState, daysThreshold = 14): InboxItem[] {
	const threshold = Date.now() - daysThreshold * 24 * 60 * 60 * 1000;

	return listInboxItems(state)
		.filter((item) => new Date(item.createdAt).getTime() < threshold);
}

// ============================================
// Projects Operations
// ============================================

export function loadProjects(): ProjectsState {
	return loadState(STORAGE_KEYS.projects, createEmptyProjectsState);
}

export function saveProjects(state: ProjectsState): void {
	saveState(STORAGE_KEYS.projects, state);
}

export function createProject(
	state: ProjectsState,
	project: Pick<Project, 'name' | 'status'> & Partial<Project>
): { state: ProjectsState; project: Project } {
	const id = generateId();
	const now = nowISO();

	const newProject: Project = {
		id,
		name: project.name,
		status: project.status,
		notesEncoded: project.notesEncoded ?? '',
		tags: project.tags ?? [],
		checklist: project.checklist ?? [],
		assets: project.assets ?? [],
		milestones: project.milestones ?? [],
		timeline: [
			{
				id: generateId(),
				atISO: now,
				type: 'status_change',
				summary: `Created with status: ${project.status}`
			}
		],
		linkedInboxIds: project.linkedInboxIds ?? [],
		createdAt: now,
		updatedAt: now
	};

	const newState = {
		...state,
		projects: { ...state.projects, [id]: newProject },
		order: [id, ...state.order]
	};

	return { state: newState, project: newProject };
}

export function updateProject(
	state: ProjectsState,
	id: string,
	updates: Partial<Omit<Project, 'id' | 'createdAt' | 'timeline'>>,
	addEvent?: Omit<ProjectEvent, 'id' | 'atISO'>
): ProjectsState {
	const project = state.projects[id];
	if (!project) return state;

	const timeline = [...(project.timeline || [])];

	// Auto-add status change event
	if (updates.status && updates.status !== project.status) {
		timeline.push({
			id: generateId(),
			atISO: nowISO(),
			type: 'status_change',
			summary: `Status changed: ${project.status} → ${updates.status}`
		});
	}

	// Add custom event if provided
	if (addEvent) {
		timeline.push({
			...addEvent,
			id: generateId(),
			atISO: nowISO()
		});
	}

	const updatedProject: Project = {
		...project,
		...updates,
		timeline,
		updatedAt: nowISO()
	};

	return {
		...state,
		projects: { ...state.projects, [id]: updatedProject }
	};
}

export function deleteProject(state: ProjectsState, id: string): ProjectsState {
	const { [id]: _, ...remaining } = state.projects;
	return {
		...state,
		projects: remaining,
		order: state.order.filter((i) => i !== id)
	};
}

export function listProjects(state: ProjectsState): Project[] {
	return state.order.map((id) => state.projects[id]).filter(Boolean);
}

export function getProject(state: ProjectsState, id: string): Project | undefined {
	return state.projects[id];
}

export function addProjectMilestone(
	state: ProjectsState,
	projectId: string,
	milestone: Omit<ProjectMilestone, 'id'>
): ProjectsState {
	const project = state.projects[projectId];
	if (!project) return state;

	const newMilestone: ProjectMilestone = {
		...milestone,
		id: generateId()
	};

	return updateProject(state, projectId, {
		milestones: [...(project.milestones || []), newMilestone]
	});
}

export function addProjectChecklistItem(
	state: ProjectsState,
	projectId: string,
	item: Omit<ProjectChecklistItem, 'id'>
): ProjectsState {
	const project = state.projects[projectId];
	if (!project) return state;

	const newItem: ProjectChecklistItem = {
		...item,
		id: generateId()
	};

	return updateProject(state, projectId, {
		checklist: [...(project.checklist || []), newItem]
	});
}

export function promoteInboxToProject(
	inboxState: InboxState,
	projectsState: ProjectsState,
	inboxId: string,
	projectName: string,
	status: Project['status'] = 'idea'
): { inboxState: InboxState; projectsState: ProjectsState; project: Project } {
	const inboxItem = inboxState.items[inboxId];
	if (!inboxItem) {
		throw new Error('Inbox item not found');
	}

	const { state: newProjectsState, project } = createProject(projectsState, {
		name: projectName || inboxItem.title,
		status,
		notesEncoded: inboxItem.bodyEncoded,
		tags: inboxItem.tags,
		linkedInboxIds: [inboxId]
	});

	const newInboxState = updateInboxItem(inboxState, inboxId, {
		promotedProjectId: project.id
	});

	return {
		inboxState: newInboxState,
		projectsState: newProjectsState,
		project
	};
}

// ============================================
// References Operations
// ============================================

export function loadReferences(): ReferencesState {
	return loadState(STORAGE_KEYS.references, createEmptyReferencesState);
}

export function saveReferences(state: ReferencesState): void {
	saveState(STORAGE_KEYS.references, state);
}

export function createReferenceLibrary(
	state: ReferencesState,
	library: Pick<ReferenceLibrary, 'name'> & Partial<ReferenceLibrary>
): { state: ReferencesState; library: ReferenceLibrary } {
	const id = generateId();
	const now = nowISO();

	const newLibrary: ReferenceLibrary = {
		id,
		name: library.name,
		createdAt: now,
		updatedAt: now,
		tracks: library.tracks ?? [],
		tags: library.tags ?? []
	};

	const newState = {
		...state,
		libraries: { ...state.libraries, [id]: newLibrary },
		order: [id, ...state.order]
	};

	return { state: newState, library: newLibrary };
}

export function updateReferenceLibrary(
	state: ReferencesState,
	id: string,
	updates: Partial<Omit<ReferenceLibrary, 'id' | 'createdAt'>>
): ReferencesState {
	const library = state.libraries[id];
	if (!library) return state;

	return {
		...state,
		libraries: {
			...state.libraries,
			[id]: { ...library, ...updates, updatedAt: nowISO() }
		}
	};
}

export function deleteReferenceLibrary(state: ReferencesState, id: string): ReferencesState {
	const { [id]: _, ...remaining } = state.libraries;
	return {
		...state,
		libraries: remaining,
		order: state.order.filter((i) => i !== id)
	};
}

export function listReferenceLibraries(state: ReferencesState): ReferenceLibrary[] {
	return state.order.map((id) => state.libraries[id]).filter(Boolean);
}

export function getReferenceLibrary(
	state: ReferencesState,
	id: string
): ReferenceLibrary | undefined {
	return state.libraries[id];
}

// ============================================
// Collections Operations
// ============================================

export function loadCollections(): CollectionsState {
	return loadState(STORAGE_KEYS.collections, createEmptyCollectionsState);
}

export function saveCollections(state: CollectionsState): void {
	saveState(STORAGE_KEYS.collections, state);
}

export function createCollection(
	state: CollectionsState,
	collection: Pick<Collection, 'name'> & Partial<Collection>
): { state: CollectionsState; collection: Collection } {
	const id = generateId();
	const now = nowISO();

	const newCollection: Collection = {
		id,
		name: collection.name,
		descriptionEncoded: collection.descriptionEncoded ?? '',
		coverImageBlobId: collection.coverImageBlobId,
		tags: collection.tags ?? [],
		items: collection.items ?? [],
		createdAt: now,
		updatedAt: now
	};

	const newState = {
		...state,
		collections: { ...state.collections, [id]: newCollection },
		order: [id, ...state.order]
	};

	return { state: newState, collection: newCollection };
}

export function updateCollection(
	state: CollectionsState,
	id: string,
	updates: Partial<Omit<Collection, 'id' | 'createdAt'>>
): CollectionsState {
	const collection = state.collections[id];
	if (!collection) return state;

	return {
		...state,
		collections: {
			...state.collections,
			[id]: { ...collection, ...updates, updatedAt: nowISO() }
		}
	};
}

export function deleteCollection(state: CollectionsState, id: string): CollectionsState {
	const { [id]: _, ...remaining } = state.collections;
	return {
		...state,
		collections: remaining,
		order: state.order.filter((i) => i !== id)
	};
}

export function listCollections(state: CollectionsState): Collection[] {
	return state.order.map((id) => state.collections[id]).filter(Boolean);
}

export function getCollection(state: CollectionsState, id: string): Collection | undefined {
	return state.collections[id];
}

export function addCollectionItem(
	state: CollectionsState,
	collectionId: string,
	item: Omit<import('./types').CollectionItem, 'id' | 'order'>
): CollectionsState {
	const collection = state.collections[collectionId];
	if (!collection) return state;

	const newItem = {
		...item,
		id: generateId(),
		order: collection.items.length
	};

	return updateCollection(state, collectionId, {
		items: [...collection.items, newItem]
	});
}

export function removeCollectionItem(
	state: CollectionsState,
	collectionId: string,
	itemId: string
): CollectionsState {
	const collection = state.collections[collectionId];
	if (!collection) return state;

	return updateCollection(state, collectionId, {
		items: collection.items.filter((i) => i.id !== itemId)
	});
}

export function reorderCollectionItems(
	state: CollectionsState,
	collectionId: string,
	itemIds: string[]
): CollectionsState {
	const collection = state.collections[collectionId];
	if (!collection) return state;

	const itemMap = new Map(collection.items.map((i) => [i.id, i]));
	const reordered = itemIds
		.map((id, index) => {
			const item = itemMap.get(id);
			return item ? { ...item, order: index } : null;
		})
		.filter(Boolean) as import('./types').CollectionItem[];

	return updateCollection(state, collectionId, { items: reordered });
}

// ============================================
// Export Helpers
// ============================================

export function exportProjectToMarkdown(project: Project): string {
	const notes = decodeBase64(project.notesEncoded);
	const lines: string[] = [
		`# ${project.name}`,
		'',
		`**Status:** ${project.status}`,
		`**Created:** ${new Date(project.createdAt).toLocaleDateString()}`,
		`**Updated:** ${new Date(project.updatedAt).toLocaleDateString()}`,
		''
	];

	if (project.tags?.length) {
		lines.push(`**Tags:** ${project.tags.join(', ')}`, '');
	}

	if (notes) {
		lines.push('## Notes', '', notes, '');
	}

	if (project.checklist?.length) {
		lines.push('## Checklist', '');
		for (const item of project.checklist) {
			lines.push(`- [${item.done ? 'x' : ' '}] ${item.text}`);
		}
		lines.push('');
	}

	if (project.milestones?.length) {
		lines.push('## Milestones', '');
		for (const m of project.milestones) {
			const dueStr = m.dueDateISO ? ` (Due: ${new Date(m.dueDateISO).toLocaleDateString()})` : '';
			const doneStr = m.done ? ' ✓' : '';
			lines.push(`- ${m.title}${dueStr}${doneStr}`);
			if (m.notesEncoded) {
				lines.push(`  ${decodeBase64(m.notesEncoded)}`);
			}
		}
		lines.push('');
	}

	if (project.assets?.length) {
		lines.push('## Assets', '');
		for (const a of project.assets) {
			const sizeStr = a.size ? ` (${formatBytes(a.size)})` : '';
			lines.push(`- ${a.name}${sizeStr}`);
		}
		lines.push('');
	}

	if (project.timeline?.length) {
		lines.push('## Timeline', '');
		for (const e of project.timeline) {
			lines.push(`- ${new Date(e.atISO).toLocaleDateString()}: ${e.summary}`);
		}
		lines.push('');
	}

	return lines.join('\n');
}

export function exportCollectionToMarkdown(collection: Collection): string {
	const description = decodeBase64(collection.descriptionEncoded || '');
	const lines: string[] = [
		`# ${collection.name}`,
		'',
		`**Created:** ${new Date(collection.createdAt).toLocaleDateString()}`,
		`**Updated:** ${new Date(collection.updatedAt).toLocaleDateString()}`,
		''
	];

	if (collection.tags?.length) {
		lines.push(`**Tags:** ${collection.tags.join(', ')}`, '');
	}

	if (description) {
		lines.push('## Description', '', description, '');
	}

	if (collection.items.length) {
		lines.push('## Items', '');
		for (const item of collection.items) {
			const note = item.noteEncoded ? ` - ${decodeBase64(item.noteEncoded)}` : '';
			lines.push(`- [${item.refType}] ${item.refId}${note}`);
		}
		lines.push('');
	}

	return lines.join('\n');
}

function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ============================================
// Unified Data Access
// ============================================

export function loadAllHubData() {
	return {
		inbox: loadInbox(),
		projects: loadProjects(),
		references: loadReferences(),
		collections: loadCollections()
	};
}

export function clearAllHubData(): void {
	if (typeof window === 'undefined') return;

	for (const key of Object.values(STORAGE_KEYS)) {
		localStorage.removeItem(key);
	}
}

