import type { Shortcut } from '../types';

export const ableton12suiteShortcuts: Shortcut[] = [
    {
        id: 'ableton12suite:toggle-session-arrangement',
        productId: 'ableton12suite',
        type: 'view',
        command: 'Toggle Session / Arrangement View',
        keys: 'Tab',
        context: 'Global',
        tags: ['view', 'session', 'arrangement']
    },
    {
        id: 'ableton12suite:play-stop',
        productId: 'ableton12suite',
        type: 'transport',
        command: 'Play / Stop',
        keys: 'Space',
        context: 'Global',
        tags: ['transport']
    },
    {
        id: 'ableton12suite:consolidate',
        productId: 'ableton12suite',
        type: 'edit',
        command: 'Consolidate',
        keys: '⌘J',
        context: 'Arrangement: selected time range',
        tags: ['edit', 'audio', 'midi']
    }
];
