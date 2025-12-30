# Global Audio Player

Persistent bottom audio player for continuous playback with autoplay support.

## Deployment

The player works on all deployment targets:
- **GitHub Pages**: Works with base path adjustments
- **Cloudflare Pages**: Works out of the box with PWA support

Audio URLs must be relative or use the `$app/paths` base:
```typescript
import { base } from '$app/paths';
const audioUrl = `${base}/audio/track.mp3`;
```

## Features

### Global Player Bar
- **Persistent**: Visible on all pages when active
- **Track info**: Title and artist display
- **Playback controls**: Play/pause, previous, next
- **Progress bar**: Click-to-seek scrubber
- **Time display**: Current position / total duration
- **Volume control**: Vertical slider popup
- **Repeat modes**: Off, repeat one, repeat all

### Queue Management
- **Auto-populate**: Click Play on any Reference to start queue
- **Autoplay next**: Automatically plays next track when current ends
- **Manual navigation**: Previous/Next buttons
- **Smart previous**: Restarts current track if past 3 seconds

### Persistence
Player preferences are saved to localStorage:
- Volume level
- Repeat mode
- Autoplay setting

## Usage

### Starting Playback
1. Navigate to References tab
2. Select a library and track
3. Click Play on any track
4. Bottom player appears with track loaded

### Controls
| Control | Action |
|---------|--------|
| ▶ / ⏸ | Play/Pause |
| ⏮ | Previous track (or restart if >3s) |
| ⏭ | Next track |
| 🔁 | Toggle repeat (off → one → all) |
| 🔊 | Volume (click to show slider) |
| ✕ | Hide player |

### Repeat Modes
- **Off**: Stops at end of queue
- **One (🔂)**: Repeats current track forever
- **All (🔁)**: Loops entire queue

## Integration

### Adding Player to New Pages
The player is automatically available on all pages via the layout.

### Playing from Components
```typescript
import { playerStore, type QueueTrack } from '$lib/player';

// Create queue from reference tracks
const tracks: QueueTrack[] = referenceList.map(ref => ({
    id: ref.id,
    title: ref.name,
    artist: ref.source,
    audioUrl: ref.audioUrl
}));

// Start playing from first track
playerStore.setQueue(tracks, 0);
```

### Responding to Player State
```typescript
import { isPlaying, currentTrack, playerVisible } from '$lib/player';

// In Svelte component
$: if ($isPlaying) {
    console.log('Now playing:', $currentTrack?.title);
}
```

## Verification

### Manual Testing
1. Open References tab
2. Add a library with audio files
3. Click Play on first track
4. Verify: Player appears at bottom
5. Verify: Track title shows
6. Wait for track to end or skip
7. Verify: Next track starts automatically
8. Toggle repeat → verify behavior changes
9. Adjust volume → verify it persists on reload

### Playwright Tests
```bash
npm run test:e2e -- --grep "Player"
```

Expected results:
- ✓ Playing Reference shows bottom player
- ✓ Track title displayed
- ✓ Play/pause toggles state
- ✓ Autoplay advances to next track
- ✓ Mobile: Player controls usable

## Technical Details

### Architecture
```
src/lib/player/
├── store.ts      # Svelte store with queue logic
├── persist.ts    # LocalStorage for preferences
├── audio.ts      # HTMLAudioElement controller
└── index.ts      # Module exports

src/lib/components/
└── BottomPlayer.svelte  # UI component
```

### State Model
```typescript
interface PlayerState {
    currentTrack: QueueTrack | null;
    status: 'idle' | 'loading' | 'playing' | 'paused' | 'error';
    currentTime: number;
    duration: number;
    queue: QueueTrack[];
    queueIndex: number;
    settings: PlayerSettings;
    error: string | null;
    isVisible: boolean;
}

interface PlayerSettings {
    autoplayNext: boolean;    // default: true
    repeatMode: 'off' | 'one' | 'all';
    volume: number;           // 0-1
    shuffle: boolean;         // default: false
}
```

### Storage Key
`producerhub_player_v1` - Player preferences only (not queue)

## Layout Integration

The player adds bottom padding to prevent content from being hidden:

```svelte
<!-- In +layout.svelte -->
<div class="main-wrapper" class:has-player={$playerVisible}>
    <slot />
</div>

<style>
    .main-wrapper.has-player {
        padding-bottom: 80px;
    }
</style>
```

## Limitations

- **HTMLAudioElement only**: Uses standard Audio API, not WebAudio
- **No waveform in player**: Progress bar only (future feature)
- **Queue not persisted**: Queue resets on page refresh
- **No shuffle**: Shuffle mode not implemented yet
- **Reference-specific**: Designed for Reference tracks, not pattern audio

## Error Handling

- **Load errors**: Shows message with "Skip" option
- **Network issues**: Error displayed in player bar
- **Unsupported format**: Graceful failure with skip option

## Mobile Considerations

- **Safe area insets**: Respects iOS home indicator
- **Touch targets**: All buttons ≥44px
- **Responsive layout**: Wraps controls on narrow screens
- **No hover-only**: All controls work with tap
