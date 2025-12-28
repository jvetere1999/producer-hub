import type { Shortcut } from '../types';

export const reasonrackShortcuts: Shortcut[] = [
    {
        id: 'reasonrack:toggle-browser',
        productId: 'reasonrack',
        type: 'view',
        command: 'Toggle Browser',
        keys: 'B',
        context: 'Rack window',
        tags: ['browser']
    },
    {
        id: 'reasonrack:flip-rack',
        productId: 'reasonrack',
        type: 'view',
        command: 'Flip Rack (rear view)',
        keys: 'Tab',
        context: 'Rack window',
        tags: ['routing', 'cables']
    },
    {
        id: 'reasonrack:duplicate-device',
        productId: 'reasonrack',
        type: 'edit',
        command: 'Duplicate device',
        keys: '⌘D',
        context: 'Selected device',
        tags: ['device']
    }
];
