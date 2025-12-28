import type { Shortcut } from '../types';

export const serum2Shortcuts: Shortcut[] = [
    {
        id: 'serum2:undo',
        productId: 'serum2',
        type: 'edit',
        command: 'Undo',
        keys: '⌘Z',
        context: 'Any edit',
        tags: ['history']
    },
    {
        id: 'serum2:redo',
        productId: 'serum2',
        type: 'edit',
        command: 'Redo',
        keys: '⇧⌘Z',
        context: 'Any edit',
        tags: ['history']
    },
    {
        id: 'serum2:toggle-audition',
        productId: 'serum2',
        type: 'browser',
        command: 'Toggle Audition / Preview',
        keys: 'Space',
        context: 'Preset browser',
        tags: ['preset', 'browser']
    }
];
