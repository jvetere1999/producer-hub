export type ThemeChoice = 'system' | 'light' | 'dark';
const THEME_STORAGE = 'producer_hub_theme';

export function getThemeChoice(): ThemeChoice {
    if (typeof localStorage === 'undefined') return 'system';
    const saved = localStorage.getItem(THEME_STORAGE);
    if (saved === 'system' || saved === 'light' || saved === 'dark') return saved;
    return 'system';
}

export function setThemeChoice(choice: ThemeChoice) {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(THEME_STORAGE, choice);
    applyTheme(choice);
}

export function applyTheme(choice: ThemeChoice) {
    if (typeof document === 'undefined') return;
    const prefersDark =
        typeof window !== 'undefined' &&
        window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: dark)').matches;

    const actual = choice === 'system' ? (prefersDark ? 'dark' : 'light') : choice;
    document.documentElement.dataset.theme = actual;
}

export function watchSystemTheme(choice: ThemeChoice, onChange: () => void) {
    if (typeof window === 'undefined' || !window.matchMedia) return () => {};
    const mq = window.matchMedia('(prefers-color-scheme: dark)');

    const handler = () => {
        if (choice === 'system') onChange();
    };

    // Safari compatibility
    if ('addEventListener' in mq) mq.addEventListener('change', handler);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    else (mq as any).addListener(handler);

    return () => {
        if ('removeEventListener' in mq) mq.removeEventListener('change', handler);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        else (mq as any).removeListener(handler);
    };
}
