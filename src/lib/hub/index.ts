/**
 * Producer Hub Module
 *
 * Re-exports all hub functionality for convenient imports.
 *
 * @module hub
 */

// Types
export * from './types';

// Encoding utilities
export { encodeBase64, decodeBase64, generateId, generateShortId, nowISO } from './encoding';

// Storage
export {
	// Inbox
	loadInbox,
	saveInbox,
	addInboxItem,
	updateInboxItem,
	deleteInboxItem,
	archiveInboxItem,
	restoreInboxItem,
	listInboxItems,
	getStaleInboxItems,
	// Projects
	loadProjects,
	saveProjects,
	createProject,
	updateProject,
	deleteProject,
	listProjects,
	getProject,
	addProjectMilestone,
	addProjectChecklistItem,
	promoteInboxToProject,
	// References
	loadReferences,
	saveReferences,
	createReferenceLibrary,
	updateReferenceLibrary,
	deleteReferenceLibrary,
	listReferenceLibraries,
	getReferenceLibrary,
	// Collections
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
	// Export
	exportProjectToMarkdown,
	exportCollectionToMarkdown,
	// Utilities
	loadAllHubData,
	clearAllHubData
} from './storage';

// IndexedDB
export {
	storeBlob,
	getBlob,
	deleteBlob,
	listBlobIds,
	storeHandle,
	getHandle,
	deleteHandle,
	storeImageBlob,
	getImageBlobUrl,
	hasFileSystemAccess,
	hasIndexedDB,
	clearAllHubData as clearAllIDBData
} from './idb';

// Search
export {
	buildHubSearchIndex,
	searchHub,
	parseHubResultId,
	invalidateHubIndex,
	type HubSearchResult
} from './search';

// Audio
export {
	computePeaks,
	generateWaveform,
	normalizePeaks,
	analyzeFrequencySpectrum,
	getAmplitudeColor,
	analyzeAudio,
	createEmptyAnnotations,
	addMarker,
	updateMarker,
	removeMarker,
	addRegion,
	updateRegion,
	removeRegion,
	addAnnotationNote,
	updateAnnotationNote,
	removeAnnotationNote,
	formatTime,
	formatTimeWithMs,
	type WaveformProgress
} from './audio';

// Commands
export {
	registerCommand,
	unregisterCommand,
	getAllCommands,
	getCommand,
	searchCommands,
	executeCommand,
	setCommandPaletteCallback,
	openCommandPalette,
	closeCommandPalette,
	toggleCommandPalette,
	setNavigationCallback,
	setPlayPauseCallback,
	setAddMarkerCallback,
	setTabNavigationCallback,
	initGlobalKeyboard,
	registerDefaultCommands,
	registerCreateCommands,
	registerPlaybackCommands
} from './commands';

