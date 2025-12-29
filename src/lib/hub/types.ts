/**
 * Producer Hub Types
 *
 * Defines the data model for the local-first producer hub.
 * All text fields that may contain sensitive content use *Encoded suffix
 * and are stored as base64 at rest.
 *
 * @module hub/types
 */

// ============================================
// Common Types
// ============================================

/**
 * Project status stages
 */
export type ProjectStatus =
	| 'idea'
	| 'active'
	| 'arrangement'
	| 'mix'
	| 'master'
	| 'released'
	| 'archived';

/**
 * Inbox item types
 */
export type InboxKind = 'idea' | 'note' | 'task';

/**
 * Timeline event types
 */
export type TimelineEventType = 'status_change' | 'export' | 'note' | 'milestone' | 'other';

/**
 * Reference item types for collections
 */
export type CollectionRefType = 'project' | 'referenceTrack' | 'infobaseNote' | 'shortcut' | 'feature';

/**
 * Search document kinds
 */
export type SearchDocKind = 'project' | 'inbox' | 'reference' | 'collection' | 'infobaseNote';

// ============================================
// A) Inbox
// ============================================

export interface InboxItem {
	id: string;
	title: string;
	/** Base64 encoded body content */
	bodyEncoded: string;
	tags?: string[];
	createdAt: string;
	updatedAt: string;
	kind: InboxKind;
	/** If promoted to a project, the project ID */
	promotedProjectId?: string;
	archived?: boolean;
}

export interface InboxState {
	version: number;
	items: Record<string, InboxItem>;
	order: string[];
}

// ============================================
// B) Projects
// ============================================

export interface ProjectAssetRef {
	id: string;
	kind: 'file' | 'folder';
	name: string;
	mime?: string;
	size?: number;
	lastModified?: number;
	/** IndexedDB handle ID (for File System Access API) */
	handleId?: string;
	/** IndexedDB blob ID */
	blobId?: string;
}

export interface ProjectMilestone {
	id: string;
	title: string;
	dueDateISO?: string;
	done: boolean;
	/** Base64 encoded notes */
	notesEncoded?: string;
}

export interface ProjectEvent {
	id: string;
	atISO: string;
	type: TimelineEventType;
	summary: string;
}

export interface ProjectChecklistItem {
	id: string;
	text: string;
	done: boolean;
}

export interface Project {
	id: string;
	name: string;
	status: ProjectStatus;
	/** Base64 encoded notes */
	notesEncoded: string;
	tags?: string[];
	checklist?: ProjectChecklistItem[];
	assets?: ProjectAssetRef[];
	milestones?: ProjectMilestone[];
	timeline?: ProjectEvent[];
	linkedInboxIds?: string[];
	createdAt: string;
	updatedAt: string;
}

export interface ProjectsState {
	version: number;
	projects: Record<string, Project>;
	order: string[];
}

// ============================================
// C) References
// ============================================

export interface AudioAnnotationMarker {
	id: string;
	/** Timestamp in seconds */
	t: number;
	/** Base64 encoded label */
	labelEncoded: string;
	color?: string;
}

export interface AudioAnnotationRegion {
	id: string;
	/** Start timestamp in seconds */
	t0: number;
	/** End timestamp in seconds */
	t1: number;
	/** Base64 encoded label */
	labelEncoded: string;
	color?: string;
}

export interface AudioAnnotationNote {
	id: string;
	/** Timestamp in seconds */
	t: number;
	/** Base64 encoded body */
	bodyEncoded: string;
}

export interface AudioAnnotations {
	version: 1;
	markers: AudioAnnotationMarker[];
	regions: AudioAnnotationRegion[];
	notes: AudioAnnotationNote[];
}

export interface WaveformData {
	version: 1;
	peaks: number[];
	/** Normalized peaks (0-1 range for display) */
	normalizedPeaks?: number[];
	durationSec: number;
}

export interface FrequencyBand {
	/** Band name: 'lows', 'mids', 'highs' */
	name: 'lows' | 'mids' | 'highs';
	/** Frequency range: [min, max] in Hz */
	freqRange: [number, number];
	/** RMS energy (0-1) */
	energy: number;
	/** Peak amplitude (0-1) */
	peak: number;
	/** Average amplitude (0-1) */
	average: number;
	/** Spectral color coding */
	color: string;
}

export interface FrequencySpectrum {
	version: 1;
	/** Timestamp when analyzed */
	analyzedAt: string;
	/** Frequency bands analysis */
	bands: FrequencyBand[];
	/** Overall RMS energy */
	overallRMS: number;
	/** Dynamic range (dB) */
	dynamicRange: number;
	/** Crest factor (peak to RMS) */
	crestFactor: number;
	/** Peak amplitude across spectrum */
	peakAmplitude: number;
}

export interface AudioAnalysis {
	version: 1;
	bpm?: number;
	key?: string;
	confidence?: number;
	source: 'heuristic' | 'webaudio';
	spectrum?: FrequencySpectrum;
}

export interface ReferenceTrack {
	id: string;
	name: string;
	mime?: string;
	size?: number;
	lastModified?: number;
	/** IndexedDB blob ID */
	blobId: string;
	durationSec?: number;
	sampleRate?: number;
	channels?: number;
	waveform?: WaveformData;
	analysis?: AudioAnalysis;
	annotations?: AudioAnnotations;
}

export interface ReferenceLibrary {
	id: string;
	name: string;
	createdAt: string;
	updatedAt: string;
	tracks: ReferenceTrack[];
	tags?: string[];
}

export interface ReferencesState {
	version: number;
	libraries: Record<string, ReferenceLibrary>;
	order: string[];
}

// ============================================
// E) Collections / Moodboards
// ============================================

export interface CollectionItem {
	id: string;
	refType: CollectionRefType;
	refId: string;
	/** Base64 encoded note */
	noteEncoded?: string;
	order?: number;
}

export interface Collection {
	id: string;
	name: string;
	/** Base64 encoded description */
	descriptionEncoded?: string;
	/** IndexedDB blob ID for cover image */
	coverImageBlobId?: string;
	tags?: string[];
	items: CollectionItem[];
	createdAt: string;
	updatedAt: string;
}

export interface CollectionsState {
	version: number;
	collections: Record<string, Collection>;
	order: string[];
}

// ============================================
// F) Unified Search
// ============================================

export interface SearchDoc {
	id: string;
	kind: SearchDocKind;
	title: string;
	text: string;
	tags?: string[];
	productId?: string;
	extra?: Record<string, string>;
}

// ============================================
// Command Palette
// ============================================

export interface Command {
	id: string;
	title: string;
	description?: string;
	hotkey?: string;
	category?: string;
	run: () => void | Promise<void>;
}

// ============================================
// Project Status Labels
// ============================================

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
	idea: 'Idea',
	active: 'Active',
	arrangement: 'Arrangement',
	mix: 'Mixing',
	master: 'Mastering',
	released: 'Released',
	archived: 'Archived'
};

export const PROJECT_STATUS_ORDER: ProjectStatus[] = [
	'idea',
	'active',
	'arrangement',
	'mix',
	'master',
	'released',
	'archived'
];

export const INBOX_KIND_LABELS: Record<InboxKind, string> = {
	idea: 'Idea',
	note: 'Note',
	task: 'Task'
};

// ============================================
// Marker/Region Colors
// ============================================

export const ANNOTATION_COLORS = [
	'#FF6B6B', // Red
	'#4ECDC4', // Teal
	'#45B7D1', // Blue
	'#96CEB4', // Green
	'#FFEAA7', // Yellow
	'#DDA0DD', // Plum
	'#FF8C42', // Orange
	'#98D8C8'  // Mint
];

