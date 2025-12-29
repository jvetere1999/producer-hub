/**
 * Producer Hub Commands Module
 *
 * Provides keyboard-driven command system with global shortcuts.
 * Commands can be registered, searched, and executed.
 *
 * @module hub/commands
 */

import type { Command } from './types';

// ============================================
// Command Registry
// ============================================

const commands = new Map<string, Command>();
let commandPaletteCallback: ((open: boolean) => void) | null = null;

/**
 * Registers a command.
 */
export function registerCommand(command: Command): void {
	commands.set(command.id, command);
}

/**
 * Unregisters a command.
 */
export function unregisterCommand(id: string): void {
	commands.delete(id);
}

/**
 * Gets all registered commands.
 */
export function getAllCommands(): Command[] {
	return Array.from(commands.values());
}

/**
 * Gets a command by ID.
 */
export function getCommand(id: string): Command | undefined {
	return commands.get(id);
}

/**
 * Searches commands by query.
 */
export function searchCommands(query: string): Command[] {
	const q = query.toLowerCase().trim();
	if (!q) return getAllCommands();

	return getAllCommands().filter(cmd => {
		const title = cmd.title.toLowerCase();
		const desc = (cmd.description || '').toLowerCase();
		const category = (cmd.category || '').toLowerCase();
		return title.includes(q) || desc.includes(q) || category.includes(q);
	});
}

/**
 * Executes a command by ID.
 */
export async function executeCommand(id: string): Promise<boolean> {
	const cmd = commands.get(id);
	if (!cmd) return false;

	try {
		await cmd.run();
		return true;
	} catch (e) {
		console.error(`Command ${id} failed:`, e);
		return false;
	}
}

// ============================================
// Command Palette Control
// ============================================

/**
 * Sets the command palette open/close callback.
 */
export function setCommandPaletteCallback(callback: (open: boolean) => void): void {
	commandPaletteCallback = callback;
}

/**
 * Opens the command palette.
 */
export function openCommandPalette(): void {
	commandPaletteCallback?.(true);
}

/**
 * Closes the command palette.
 */
export function closeCommandPalette(): void {
	commandPaletteCallback?.(false);
}

/**
 * Toggles the command palette.
 */
export function toggleCommandPalette(): void {
	// This will be handled by the component
}

// ============================================
// Global Keyboard Handler
// ============================================

let keyboardHandler: ((e: KeyboardEvent) => void) | null = null;
let navigationCallback: ((tab: string) => void) | null = null;
let playPauseCallback: (() => void) | null = null;
let addMarkerCallback: (() => void) | null = null;

/**
 * Sets the navigation callback for quick nav shortcuts.
 */
export function setNavigationCallback(callback: (tab: string) => void): void {
	navigationCallback = callback;
}

/**
 * Sets the play/pause callback for audio controls.
 */
export function setPlayPauseCallback(callback: () => void): void {
	playPauseCallback = callback;
}

/**
 * Sets the add marker callback.
 */
export function setAddMarkerCallback(callback: () => void): void {
	addMarkerCallback = callback;
}

/**
 * Initializes global keyboard shortcuts.
 */
export function initGlobalKeyboard(): () => void {
	if (typeof window === 'undefined') return () => {};

	keyboardHandler = (e: KeyboardEvent) => {
		const target = e.target as HTMLElement;
		const isInput = target.tagName === 'INPUT' ||
			target.tagName === 'TEXTAREA' ||
			target.isContentEditable;

		// Cmd/Ctrl+K: Open command palette
		if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
			e.preventDefault();
			openCommandPalette();
			return;
		}

		// Space: Play/pause (only when not in input)
		if (e.key === ' ' && !isInput) {
			e.preventDefault();
			playPauseCallback?.();
			return;
		}

		// M: Add marker at current time (only when not in input)
		if (e.key === 'm' && !isInput && !e.metaKey && !e.ctrlKey) {
			e.preventDefault();
			addMarkerCallback?.();
			return;
		}

		// Quick navigation: g then p/i/s/r/c
		// This is a simple implementation - could be enhanced with a chord system
	};

	window.addEventListener('keydown', keyboardHandler);

	return () => {
		if (keyboardHandler) {
			window.removeEventListener('keydown', keyboardHandler);
			keyboardHandler = null;
		}
	};
}

// ============================================
// Default Commands
// ============================================

/**
 * Registers default hub commands.
 */
export function registerDefaultCommands(navigate: (tab: string) => void): void {
	registerCommand({
		id: 'navigate.shortcuts',
		title: 'Go to Shortcuts',
		description: 'Navigate to shortcuts tab',
		category: 'Navigation',
		hotkey: 'g s',
		run: () => navigate('shortcuts')
	});

	registerCommand({
		id: 'navigate.infobase',
		title: 'Go to Info Base',
		description: 'Navigate to Info Base tab',
		category: 'Navigation',
		hotkey: 'g i',
		run: () => navigate('infobase')
	});

	registerCommand({
		id: 'navigate.projects',
		title: 'Go to Projects',
		description: 'Navigate to Projects tab',
		category: 'Navigation',
		hotkey: 'g p',
		run: () => navigate('projects')
	});

	registerCommand({
		id: 'navigate.references',
		title: 'Go to References',
		description: 'Navigate to References library',
		category: 'Navigation',
		hotkey: 'g r',
		run: () => navigate('references')
	});

	registerCommand({
		id: 'navigate.collections',
		title: 'Go to Collections',
		description: 'Navigate to Collections/Moodboards',
		category: 'Navigation',
		hotkey: 'g c',
		run: () => navigate('collections')
	});

	registerCommand({
		id: 'navigate.inbox',
		title: 'Go to Inbox',
		description: 'Navigate to Inbox for quick ideas',
		category: 'Navigation',
		run: () => navigate('inbox')
	});

	registerCommand({
		id: 'navigate.search',
		title: 'Search Everything',
		description: 'Open global search',
		category: 'Navigation',
		run: () => navigate('search')
	});
}

/**
 * Registers create commands.
 */
export function registerCreateCommands(
	createProject: () => void,
	createNote: () => void,
	createCollection: () => void,
	addInboxItem: () => void
): void {
	registerCommand({
		id: 'create.project',
		title: 'New Project',
		description: 'Create a new project',
		category: 'Create',
		run: createProject
	});

	registerCommand({
		id: 'create.note',
		title: 'New Note',
		description: 'Create a new Info Base note',
		category: 'Create',
		run: createNote
	});

	registerCommand({
		id: 'create.collection',
		title: 'New Collection',
		description: 'Create a new collection/moodboard',
		category: 'Create',
		run: createCollection
	});

	registerCommand({
		id: 'create.inbox',
		title: 'Quick Add to Inbox',
		description: 'Add a quick idea to inbox',
		category: 'Create',
		run: addInboxItem
	});
}

/**
 * Registers playback commands.
 */
export function registerPlaybackCommands(
	playPause: () => void,
	addMarker: () => void
): void {
	registerCommand({
		id: 'playback.toggle',
		title: 'Play/Pause',
		description: 'Toggle audio playback',
		category: 'Playback',
		hotkey: 'Space',
		run: playPause
	});

	registerCommand({
		id: 'playback.marker',
		title: 'Add Marker',
		description: 'Add marker at current playback time',
		category: 'Playback',
		hotkey: 'M',
		run: addMarker
	});
}

