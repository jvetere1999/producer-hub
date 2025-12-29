/**
 * Producer Hub Search Module
 *
 * Provides FlexSearch-based search for hub entities.
 * Maintains separate index from shortcuts, merges results in UI.
 *
 * @module hub/search
 */

import FlexSearch from 'flexsearch';
import type {
	InboxState,
	ProjectsState,
	ReferencesState,
	CollectionsState,
	SearchDoc,
	SearchDocKind
} from './types';
import { decodeBase64 } from './encoding';

/**
 * Hub search index document shape.
 */
interface HubDoc {
	id: string;
	kind: string;
	title: string;
	text: string;
	tags: string;
}

/** Cached FlexSearch index instance */
let hubIndex: any = null;
/** Track indexed IDs for cache invalidation */
let indexedDocIds = new Set<string>();
/** Version counter for invalidation */
let indexVersion = 0;

/**
 * Builds or returns the cached hub FlexSearch index.
 */
export function buildHubSearchIndex(
	inbox: InboxState,
	projects: ProjectsState,
	references: ReferencesState,
	collections: CollectionsState
): any {
	const docs: SearchDoc[] = [];

	// Add inbox items
	for (const item of Object.values(inbox.items)) {
		if (item.archived) continue;
		docs.push({
			id: `inbox:${item.id}`,
			kind: 'inbox',
			title: item.title,
			text: decodeBase64(item.bodyEncoded),
			tags: item.tags
		});
	}

	// Add projects
	for (const project of Object.values(projects.projects)) {
		docs.push({
			id: `project:${project.id}`,
			kind: 'project',
			title: project.name,
			text: decodeBase64(project.notesEncoded),
			tags: project.tags
		});
	}

	// Add reference tracks
	for (const library of Object.values(references.libraries)) {
		for (const track of library.tracks) {
			// Include annotation labels in searchable text
			let annotationText = '';
			if (track.annotations) {
				annotationText += track.annotations.markers.map(m => decodeBase64(m.labelEncoded)).join(' ');
				annotationText += ' ' + track.annotations.regions.map(r => decodeBase64(r.labelEncoded)).join(' ');
				annotationText += ' ' + track.annotations.notes.map(n => decodeBase64(n.bodyEncoded)).join(' ');
			}

			docs.push({
				id: `reference:${track.id}`,
				kind: 'reference',
				title: track.name,
				text: annotationText,
				tags: library.tags,
				extra: {
					libraryId: library.id,
					libraryName: library.name
				}
			});
		}
	}

	// Add collections
	for (const collection of Object.values(collections.collections)) {
		docs.push({
			id: `collection:${collection.id}`,
			kind: 'collection',
			title: collection.name,
			text: decodeBase64(collection.descriptionEncoded || ''),
			tags: collection.tags
		});
	}

	// Check if rebuild needed
	const newDocIds = new Set(docs.map(d => d.id));
	const needsRebuild = docs.length !== indexedDocIds.size ||
		docs.some(d => !indexedDocIds.has(d.id));

	if (hubIndex && !needsRebuild) {
		return hubIndex;
	}

	// Build new index
	hubIndex = new (FlexSearch as any).Document({
		document: {
			id: 'id',
			index: ['title', 'text', 'tags'],
			store: ['kind', 'title']
		},
		tokenize: 'forward',
		encode: 'icase',
		cache: 100,
		context: true
	});

	for (const doc of docs) {
		hubIndex.add({
			id: doc.id,
			kind: doc.kind,
			title: doc.title,
			text: doc.text,
			tags: (doc.tags || []).join(' ')
		});
	}

	indexedDocIds = newDocIds;
	indexVersion++;

	return hubIndex;
}

/**
 * Search result type.
 */
export interface HubSearchResult {
	id: string;
	kind: SearchDocKind;
	title: string;
	score: number;
}

/**
 * Searches the hub index.
 */
export function searchHub(
	query: string,
	inbox: InboxState,
	projects: ProjectsState,
	references: ReferencesState,
	collections: CollectionsState,
	options: { limit?: number } = {}
): HubSearchResult[] {
	const { limit = 50 } = options;

	if (!query.trim()) return [];

	const index = buildHubSearchIndex(inbox, projects, references, collections);
	const results = index.search(query.trim(), { limit, enrich: true });

	// FlexSearch returns results per field, dedupe and rank
	const seen = new Map<string, HubSearchResult>();

	for (const fieldResult of results) {
		for (const item of fieldResult.result) {
			const id = item.id as string;
			if (!seen.has(id)) {
				const doc = item.doc as { kind: SearchDocKind; title: string };
				seen.set(id, {
					id,
					kind: doc.kind,
					title: doc.title,
					score: 1
				});
			} else {
				// Boost score for multi-field matches
				seen.get(id)!.score++;
			}
		}
	}

	// Sort by score, then title
	return Array.from(seen.values())
		.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
		.slice(0, limit);
}

/**
 * Parses a hub search result ID to extract kind and original ID.
 */
export function parseHubResultId(resultId: string): { kind: SearchDocKind; id: string } {
	const [kind, ...rest] = resultId.split(':');
	return {
		kind: kind as SearchDocKind,
		id: rest.join(':')
	};
}

/**
 * Invalidates the hub search index cache.
 * Call after data changes.
 */
export function invalidateHubIndex(): void {
	hubIndex = null;
	indexedDocIds.clear();
}

/**
 * Gets the current index version (for debugging).
 */
export function getHubIndexVersion(): number {
	return indexVersion;
}

