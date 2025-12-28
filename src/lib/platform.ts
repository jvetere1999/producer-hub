import type { Shortcut } from './types';

export type KeyOS = 'mac' | 'win';
const KEY_OS_STORAGE = 'daw_key_os';

export function detectDefaultKeyOS(): KeyOS {
    if (typeof navigator === 'undefined') return 'mac';

    // Prefer UA-CH if available
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const uaData = (navigator as any).userAgentData;
    if (uaData?.platform) {
        const p = String(uaData.platform).toLowerCase();
        if (p.includes('mac')) return 'mac';
        if (p.includes('win')) return 'win';
    }

    const plat = (navigator.platform || '').toLowerCase();
    if (plat.includes('mac')) return 'mac';
    if (plat.includes('win')) return 'win';

    const ua = (navigator.userAgent || '').toLowerCase();
    if (ua.includes('mac os')) return 'mac';
    if (ua.includes('windows')) return 'win';

    return 'mac';
}

export function getKeyOSPreference(): KeyOS {
    if (typeof localStorage === 'undefined') return 'mac';
    const saved = localStorage.getItem(KEY_OS_STORAGE);
    if (saved === 'mac' || saved === 'win') return saved;
    return detectDefaultKeyOS();
}

export function setKeyOSPreference(os: KeyOS) {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(KEY_OS_STORAGE, os);
}

/**
 * Derive a Windows-friendly label from mac glyph strings.
 * Input examples: "⇧⌘Z", "⌘⌥M", "Space", "Tab", "⌃⌥⌘K"
 * Output examples: "Ctrl+Shift+Z", "Ctrl+Alt+M", "Space", "Tab", "Ctrl+Alt+K"
 */
export function macToWinKeys(keys: string): string {
    const raw = keys.trim();
    if (!raw) return raw;

    // If it already looks like "Ctrl+..." keep it
    if (/[A-Za-z]+\+/.test(raw) || raw.includes('Ctrl+') || raw.includes('Alt+') || raw.includes('Shift+')) {
        return raw;
    }

    const mods: string[] = [];
    let rest = raw;

    if (rest.includes('⌃')) {
        mods.push('Ctrl');
        rest = rest.replaceAll('⌃', '');
    }
    if (rest.includes('⇧')) {
        mods.push('Shift');
        rest = rest.replaceAll('⇧', '');
    }
    if (rest.includes('⌥')) {
        mods.push('Alt');
        rest = rest.replaceAll('⌥', '');
    }
    if (rest.includes('⌘')) {
        // Convention: map Cmd to Ctrl on Windows
        mods.push('Ctrl');
        rest = rest.replaceAll('⌘', '');
    }

    const key = rest.trim();

    // Deduplicate Ctrl if both ⌃ and ⌘ were present
    const dedup = Array.from(new Set(mods));

    return dedup.length ? `${dedup.join('+')}+${key || ''}`.replace(/\+$/, '') : key;
}

export function resolveKeysForOS(shortcut: Shortcut, os: KeyOS): string {
    if (os === 'mac') return shortcut.keys;
    return shortcut.keysWin?.trim() ? shortcut.keysWin : macToWinKeys(shortcut.keys);
}
