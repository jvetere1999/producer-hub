/**
 * Unit tests for Producer Hub storage utilities.
 *
 * Note: These tests run in Node.js where window is undefined.
 * We test the pure functions without localStorage persistence.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
	addInboxItem,
	updateInboxItem,
	deleteInboxItem,
	archiveInboxItem,
	restoreInboxItem,
	listInboxItems,
	getStaleInboxItems,
	createProject,
	updateProject,
	deleteProject,
	listProjects,
	promoteInboxToProject,
	createCollection,
	addCollectionItem,
	removeCollectionItem,
	exportProjectToMarkdown
} from '../hub/storage';
import { encodeBase64, decodeBase64 } from '../hub/encoding';
import type { InboxState, ProjectsState, CollectionsState } from '../hub/types';

// Helper to create empty states
function emptyInbox(): InboxState {
	return { version: 1, items: {}, order: [] };
}

function emptyProjects(): ProjectsState {
	return { version: 1, projects: {}, order: [] };
}

function emptyCollections(): CollectionsState {
	return { version: 1, collections: {}, order: [] };
}

describe('Inbox Storage', () => {
	it('should create empty inbox state', () => {
		const state = emptyInbox();
		expect(state.version).toBe(1);
		expect(state.items).toEqual({});
		expect(state.order).toEqual([]);
	});

	it('should add inbox items', () => {
		let state = emptyInbox();
		state = addInboxItem(state, {
			title: 'Test Idea',
			bodyEncoded: encodeBase64('Test body'),
			kind: 'idea'
		});

		expect(state.order).toHaveLength(1);
		expect(state.items[state.order[0]].title).toBe('Test Idea');
	});

	it('should add inbox items to the beginning', () => {
		let state = emptyInbox();
		state = addInboxItem(state, { title: 'First', bodyEncoded: '', kind: 'idea' });
		state = addInboxItem(state, { title: 'Second', bodyEncoded: '', kind: 'note' });

		expect(state.order).toHaveLength(2);
		expect(state.items[state.order[0]].title).toBe('Second'); // Most recent first
		expect(state.items[state.order[1]].title).toBe('First');
	});

	it('should update inbox items', () => {
		let state = emptyInbox();
		state = addInboxItem(state, { title: 'Original', bodyEncoded: '', kind: 'idea' });
		const id = state.order[0];

		state = updateInboxItem(state, id, { title: 'Updated' });

		expect(state.items[id].title).toBe('Updated');
	});

	it('should delete inbox items', () => {
		let state = emptyInbox();
		state = addInboxItem(state, { title: 'To Delete', bodyEncoded: '', kind: 'idea' });
		const id = state.order[0];

		state = deleteInboxItem(state, id);

		expect(state.order).toHaveLength(0);
		expect(state.items[id]).toBeUndefined();
	});

	it('should archive and restore items', () => {
		let state = emptyInbox();
		state = addInboxItem(state, { title: 'Item', bodyEncoded: '', kind: 'idea' });
		const id = state.order[0];

		state = archiveInboxItem(state, id);
		expect(state.items[id].archived).toBe(true);

		state = restoreInboxItem(state, id);
		expect(state.items[id].archived).toBe(false);
	});

	it('should filter archived items in list', () => {
		let state = emptyInbox();
		state = addInboxItem(state, { title: 'Active', bodyEncoded: '', kind: 'idea' });
		state = addInboxItem(state, { title: 'Archived', bodyEncoded: '', kind: 'idea' });
		state = archiveInboxItem(state, state.order[0]);

		const active = listInboxItems(state);
		const all = listInboxItems(state, { includeArchived: true });

		expect(active).toHaveLength(1);
		expect(all).toHaveLength(2);
	});

	it('should find stale items', () => {
		let state = emptyInbox();
		state = addInboxItem(state, { title: 'Recent', bodyEncoded: '', kind: 'idea' });

		// Manually make an item old
		const id = state.order[0];
		const oldDate = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString();
		state.items[id].createdAt = oldDate;

		const stale = getStaleInboxItems(state, 14);
		expect(stale).toHaveLength(1);
	});
});

describe('Projects Storage', () => {
	it('should create projects with timeline', () => {
		let state = emptyProjects();
		const result = createProject(state, { name: 'My Track', status: 'idea' });

		expect(result.project.name).toBe('My Track');
		expect(result.project.status).toBe('idea');
		expect(result.project.timeline).toHaveLength(1);
		expect(result.project.timeline![0].type).toBe('status_change');
	});

	it('should auto-add timeline events on status change', () => {
		let state = emptyProjects();
		const { state: s1, project } = createProject(state, { name: 'Track', status: 'idea' });

		const s2 = updateProject(s1, project.id, { status: 'active' });

		const updated = s2.projects[project.id];
		expect(updated.timeline).toHaveLength(2);
		expect(updated.timeline![1].summary).toContain('idea → active');
	});

	it('should manage projects in state', () => {
		let state = emptyProjects();
		const { state: s1 } = createProject(state, { name: 'Persisted', status: 'mix' });

		expect(listProjects(s1)).toHaveLength(1);
		expect(listProjects(s1)[0].name).toBe('Persisted');
	});

	it('should delete projects', () => {
		let state = emptyProjects();
		const { state: s1, project } = createProject(state, { name: 'To Delete', status: 'idea' });

		const s2 = deleteProject(s1, project.id);

		expect(listProjects(s2)).toHaveLength(0);
	});
});

describe('Promote Inbox to Project', () => {
	it('should create project from inbox item', () => {
		let inboxState = emptyInbox();
		let projectsState = emptyProjects();

		inboxState = addInboxItem(inboxState, {
			title: 'Cool Idea',
			bodyEncoded: encodeBase64('Notes about the idea'),
			kind: 'idea',
			tags: ['electronic', 'ambient']
		});
		const inboxId = inboxState.order[0];

		const result = promoteInboxToProject(
			inboxState,
			projectsState,
			inboxId,
			'Cool Idea Project',
			'active'
		);

		expect(result.project.name).toBe('Cool Idea Project');
		expect(result.project.status).toBe('active');
		expect(decodeBase64(result.project.notesEncoded)).toBe('Notes about the idea');
		expect(result.project.tags).toEqual(['electronic', 'ambient']);
		expect(result.inboxState.items[inboxId].promotedProjectId).toBe(result.project.id);
	});
});

describe('Collections Storage', () => {
	it('should create collections', () => {
		let state = emptyCollections();
		const { state: s1, collection } = createCollection(state, { name: 'Moodboard' });

		expect(s1.collections[collection.id].name).toBe('Moodboard');
	});

	it('should add items to collection', () => {
		let state = emptyCollections();
		const { state: s1, collection } = createCollection(state, { name: 'Test' });

		const s2 = addCollectionItem(s1, collection.id, {
			refType: 'project',
			refId: 'proj-123',
			noteEncoded: encodeBase64('Reference track inspiration')
		});

		expect(s2.collections[collection.id].items).toHaveLength(1);
		expect(s2.collections[collection.id].items[0].refId).toBe('proj-123');
	});

	it('should remove items from collection', () => {
		let state = emptyCollections();
		const { state: s1, collection } = createCollection(state, { name: 'Test' });
		const s2 = addCollectionItem(s1, collection.id, {
			refType: 'project',
			refId: 'proj-123'
		});
		const itemId = s2.collections[collection.id].items[0].id;

		const s3 = removeCollectionItem(s2, collection.id, itemId);

		expect(s3.collections[collection.id].items).toHaveLength(0);
	});
});

describe('Export to Markdown', () => {
	it('should export project to markdown', () => {
		let state = emptyProjects();
		const { state: s1, project } = createProject(state, {
			name: 'Export Test',
			status: 'mix',
			notesEncoded: encodeBase64('Some notes here'),
			tags: ['techno', 'dark'],
			checklist: [
				{ id: '1', text: 'Mix bass', done: true },
				{ id: '2', text: 'Add FX', done: false }
			],
			milestones: [
				{ id: 'm1', title: 'Demo ready', done: false }
			]
		});

		const md = exportProjectToMarkdown(project);

		expect(md).toContain('# Export Test');
		expect(md).toContain('**Status:** mix');
		expect(md).toContain('**Tags:** techno, dark');
		expect(md).toContain('Some notes here');
		expect(md).toContain('[x] Mix bass');
		expect(md).toContain('[ ] Add FX');
		expect(md).toContain('Demo ready');
	});
});

