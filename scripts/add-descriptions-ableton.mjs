/**
 * Script to add description fields to ableton12suite.ts
 * Run with: node scripts/add-descriptions-ableton.mjs
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const filePath = join(__dirname, '../src/lib/data/ableton12suite.ts');
const DESCRIPTION_SOURCE = 'https://www.ableton.com/en/manual/live-keyboard-shortcuts/';

let content = readFileSync(filePath, 'utf-8');

function generateDescription(command) {
    // Create a simple description based on the command
    const cmd = command.toLowerCase();

    if (cmd.includes('toggle')) {
        const thing = command.replace(/^Toggle\s+/i, '');
        return `Toggles ${thing} on or off.`;
    }
    if (cmd.startsWith('open ') || cmd.startsWith('Open ')) {
        const thing = command.replace(/^Open\s+/i, '');
        return `Opens ${thing}.`;
    }
    if (cmd.startsWith('close ') || cmd.startsWith('Close ')) {
        const thing = command.replace(/^Close\s+/i, '');
        return `Closes ${thing}.`;
    }
    if (cmd.includes('select all')) {
        return `Selects all items in the current context.`;
    }
    if (cmd.includes('select')) {
        return `${command} in the current view.`;
    }
    if (cmd.startsWith('insert ') || cmd.startsWith('Insert ')) {
        const thing = command.replace(/^Insert\s+/i, '');
        return `Inserts ${thing} at the current position.`;
    }
    if (cmd.includes('delete')) {
        return `${command} from the current context.`;
    }
    if (cmd.includes('duplicate')) {
        return `${command} to create a copy.`;
    }
    if (cmd.includes('zoom')) {
        return `${command} to adjust the view scale.`;
    }
    if (cmd.includes('navigate') || cmd.includes('go to') || cmd.includes('move')) {
        return `${command} for quick navigation.`;
    }
    if (cmd.includes('undo')) {
        return `Undoes the last action.`;
    }
    if (cmd.includes('redo')) {
        return `Redoes the previously undone action.`;
    }
    if (cmd.includes('copy')) {
        return `Copies the selected item to clipboard.`;
    }
    if (cmd.includes('paste')) {
        return `Pastes content from clipboard.`;
    }
    if (cmd.includes('cut')) {
        return `Cuts the selected item to clipboard.`;
    }
    if (cmd.includes('save')) {
        return `${command} to preserve your work.`;
    }
    if (cmd.includes('play') || cmd.includes('stop') || cmd.includes('record')) {
        return `${command} for transport control.`;
    }

    return `${command} in Ableton Live.`;
}

// Check if file already has descriptions
if (content.includes('description:')) {
    console.log('File already has descriptions. Skipping.');
    process.exit(0);
}

// Find all entries and add description after command line
const regex = /(command: '([^']+)',\n)(\s+keys:)/g;

let count = 0;
content = content.replace(regex, (match, commandLine, commandText, keysLine) => {
    const desc = generateDescription(commandText).replace(/'/g, "\\'");
    count++;
    return `${commandLine}        description: '${desc}',\n        descriptionSource: '${DESCRIPTION_SOURCE}',\n${keysLine}`;
});

writeFileSync(filePath, content, 'utf-8');
console.log(`Updated ${count} entries with descriptions in ableton12suite.ts`);

