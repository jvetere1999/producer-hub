const COOKIE_NAME = 'daw_favs';
const LS_KEY = 'daw_favs';

function readCookie(name: string): string | null {
    if (typeof document === 'undefined') return null;
    const parts = document.cookie.split(';').map((p) => p.trim());
    for (const p of parts) {
        if (p.startsWith(name + '=')) return decodeURIComponent(p.slice(name.length + 1));
    }
    return null;
}

function writeCookie(name: string, value: string, days = 365 * 3) {
    if (typeof document === 'undefined') return;
    const maxAge = days * 24 * 60 * 60;
    document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${maxAge}; Path=/; SameSite=Lax`;
}

function parseIds(raw: string | null): Set<string> {
    if (!raw) return new Set();
    return new Set(
        raw
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
    );
}

function serializeIds(ids: Set<string>): string {
    return [...ids].sort((a, b) => a.localeCompare(b)).join(',');
}

export function loadFavorites(): Set<string> {
    if (typeof window === 'undefined') return new Set();

    const fromCookie = parseIds(readCookie(COOKIE_NAME));
    const fromLs = parseIds(localStorage.getItem(LS_KEY));
    const merged = new Set<string>([...fromCookie, ...fromLs]);

    // heal storage
    const ser = serializeIds(merged);
    writeCookie(COOKIE_NAME, ser);
    localStorage.setItem(LS_KEY, ser);

    return merged;
}

export function saveFavorites(ids: Set<string>) {
    if (typeof window === 'undefined') return;
    const ser = serializeIds(ids);
    writeCookie(COOKIE_NAME, ser);
    localStorage.setItem(LS_KEY, ser);
}

export function toggleFavorite(ids: Set<string>, id: string): Set<string> {
    const next = new Set(ids);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    saveFavorites(next);
    return next;
}
