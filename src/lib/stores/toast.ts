/**
 * Toast Store
 *
 * A minimal reactive toast notification system.
 * Supports error, success, and info toast types with auto-dismiss.
 */

import { writable } from 'svelte/store';

export type ToastType = 'error' | 'success' | 'info';

export interface Toast {
    id: string;
    type: ToastType;
    message: string;
    duration: number;
}

function createToastStore() {
    const { subscribe, update } = writable<Toast[]>([]);

    let idCounter = 0;

    function add(message: string, type: ToastType = 'info', duration = 4000): string {
        const id = `toast-${++idCounter}`;
        const toast: Toast = { id, type, message, duration };

        update(toasts => [...toasts, toast]);

        // Auto-dismiss after duration
        if (duration > 0) {
            setTimeout(() => {
                dismiss(id);
            }, duration);
        }

        return id;
    }

    function dismiss(id: string) {
        update(toasts => toasts.filter(t => t.id !== id));
    }

    function clear() {
        update(() => []);
    }

    return {
        subscribe,
        add,
        dismiss,
        clear,
        // Convenience methods
        error: (message: string, duration = 5000) => add(message, 'error', duration),
        success: (message: string, duration = 3000) => add(message, 'success', duration),
        info: (message: string, duration = 4000) => add(message, 'info', duration)
    };
}

export const toasts = createToastStore();

