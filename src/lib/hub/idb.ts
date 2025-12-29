/**
 * Producer Hub IndexedDB Storage
 *
 * Handles IndexedDB persistence for blobs, file handles, and large data.
 * Uses a simple key-value store pattern with versioned migrations.
 *
 * @module hub/idb
 */

const DB_NAME = 'daw_hub_db';
const DB_VERSION = 1;
const BLOB_STORE = 'blobs';
const HANDLE_STORE = 'handles';

let dbPromise: Promise<IDBDatabase> | null = null;

/**
 * Opens or creates the IndexedDB database.
 */
function openDB(): Promise<IDBDatabase> {
	if (dbPromise) return dbPromise;

	dbPromise = new Promise((resolve, reject) => {
		if (typeof indexedDB === 'undefined') {
			reject(new Error('IndexedDB not available'));
			return;
		}

		const request = indexedDB.open(DB_NAME, DB_VERSION);

		request.onerror = () => reject(request.error);
		request.onsuccess = () => resolve(request.result);

		request.onupgradeneeded = (event) => {
			const db = (event.target as IDBOpenDBRequest).result;

			// Create blob store if it doesn't exist
			if (!db.objectStoreNames.contains(BLOB_STORE)) {
				db.createObjectStore(BLOB_STORE, { keyPath: 'id' });
			}

			// Create handle store if it doesn't exist
			if (!db.objectStoreNames.contains(HANDLE_STORE)) {
				db.createObjectStore(HANDLE_STORE, { keyPath: 'id' });
			}
		};
	});

	return dbPromise;
}

/**
 * Stores a blob in IndexedDB.
 * @param id - Unique blob ID
 * @param blob - The blob or ArrayBuffer to store
 * @param metadata - Optional metadata to store with the blob
 */
export async function storeBlob(
	id: string,
	blob: Blob | ArrayBuffer,
	metadata?: Record<string, unknown>
): Promise<void> {
	const db = await openDB();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(BLOB_STORE, 'readwrite');
		const store = tx.objectStore(BLOB_STORE);

		const data = {
			id,
			blob,
			metadata,
			storedAt: new Date().toISOString()
		};

		const request = store.put(data);
		request.onerror = () => reject(request.error);
		request.onsuccess = () => resolve();
	});
}

/**
 * Retrieves a blob from IndexedDB.
 * @param id - The blob ID
 * @returns The blob data or null if not found
 */
export async function getBlob(
	id: string
): Promise<{ blob: Blob | ArrayBuffer; metadata?: Record<string, unknown> } | null> {
	const db = await openDB();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(BLOB_STORE, 'readonly');
		const store = tx.objectStore(BLOB_STORE);
		const request = store.get(id);

		request.onerror = () => reject(request.error);
		request.onsuccess = () => {
			if (request.result) {
				resolve({ blob: request.result.blob, metadata: request.result.metadata });
			} else {
				resolve(null);
			}
		};
	});
}

/**
 * Deletes a blob from IndexedDB.
 * @param id - The blob ID
 */
export async function deleteBlob(id: string): Promise<void> {
	const db = await openDB();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(BLOB_STORE, 'readwrite');
		const store = tx.objectStore(BLOB_STORE);
		const request = store.delete(id);

		request.onerror = () => reject(request.error);
		request.onsuccess = () => resolve();
	});
}

/**
 * Lists all blob IDs in the store.
 */
export async function listBlobIds(): Promise<string[]> {
	const db = await openDB();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(BLOB_STORE, 'readonly');
		const store = tx.objectStore(BLOB_STORE);
		const request = store.getAllKeys();

		request.onerror = () => reject(request.error);
		request.onsuccess = () => resolve(request.result as string[]);
	});
}

/**
 * Stores a file handle in IndexedDB (File System Access API).
 * Note: Handles may lose permission on browser restart.
 * @param id - Unique handle ID
 * @param handle - The FileSystemHandle
 */
export async function storeHandle(
	id: string,
	handle: FileSystemHandle,
	metadata?: Record<string, unknown>
): Promise<void> {
	// Feature detection
	if (typeof FileSystemHandle === 'undefined') {
		console.warn('File System Access API not available');
		return;
	}

	const db = await openDB();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(HANDLE_STORE, 'readwrite');
		const store = tx.objectStore(HANDLE_STORE);

		const data = {
			id,
			handle,
			metadata,
			storedAt: new Date().toISOString()
		};

		const request = store.put(data);
		request.onerror = () => reject(request.error);
		request.onsuccess = () => resolve();
	});
}

/**
 * Retrieves a file handle from IndexedDB.
 * @param id - The handle ID
 */
export async function getHandle(
	id: string
): Promise<{ handle: FileSystemHandle; metadata?: Record<string, unknown> } | null> {
	if (typeof FileSystemHandle === 'undefined') {
		return null;
	}

	const db = await openDB();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(HANDLE_STORE, 'readonly');
		const store = tx.objectStore(HANDLE_STORE);
		const request = store.get(id);

		request.onerror = () => reject(request.error);
		request.onsuccess = () => {
			if (request.result) {
				resolve({ handle: request.result.handle, metadata: request.result.metadata });
			} else {
				resolve(null);
			}
		};
	});
}

/**
 * Deletes a file handle from IndexedDB.
 * @param id - The handle ID
 */
export async function deleteHandle(id: string): Promise<void> {
	const db = await openDB();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(HANDLE_STORE, 'readwrite');
		const store = tx.objectStore(HANDLE_STORE);
		const request = store.delete(id);

		request.onerror = () => reject(request.error);
		request.onsuccess = () => resolve();
	});
}

/**
 * Stores an image blob for collection covers.
 * @param id - Unique blob ID
 * @param blob - Image blob
 */
export async function storeImageBlob(id: string, blob: Blob): Promise<void> {
	return storeBlob(id, blob, { type: 'image', mime: blob.type });
}

/**
 * Gets an image blob URL for display.
 * @param id - The blob ID
 * @returns Object URL or null
 */
export async function getImageBlobUrl(id: string): Promise<string | null> {
	const result = await getBlob(id);
	if (!result) return null;

	const blob = result.blob instanceof Blob ? result.blob : new Blob([result.blob]);
	return URL.createObjectURL(blob);
}

/**
 * Checks if File System Access API is available (specifically directory picker).
 */
export function hasFileSystemAccess(): boolean {
	return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

/**
 * Checks if IndexedDB is available.
 */
export function hasIndexedDB(): boolean {
	return typeof indexedDB !== 'undefined';
}

/**
 * Clears all hub data from IndexedDB.
 */
export async function clearAllHubData(): Promise<void> {
	const db = await openDB();

	return new Promise((resolve, reject) => {
		const tx = db.transaction([BLOB_STORE, HANDLE_STORE], 'readwrite');

		tx.objectStore(BLOB_STORE).clear();
		tx.objectStore(HANDLE_STORE).clear();

		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
	});
}

