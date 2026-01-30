# Yospace Ad Management SDK

**Version:** 1.7.10

A client-side JavaScript SDK for Server-Side Ad Insertion (SSAI) with Yospace streams. This library handles ad session management, VAST/VMAP parsing, analytics tracking, and timeline management for HLS and DASH video streams.

## Overview

The Yospace Ad Management SDK enables video players to:

- Establish ad sessions with Yospace's SSAI platform
- Parse and process VMAP/VAST ad responses
- Track ad playback events (impressions, quartiles, completion)
- Manage playback timelines with interleaved content and ads
- Handle live, VOD, and DVR (live pause) streaming scenarios

## Installation

Include the SDK in your project:

```html
<script src="yo-ad-management.min.js"></script>
```

Or using CommonJS:

```javascript
const { YSSessionManager } = require('./yo-ad-management.js');
```

## Quick Start

### VOD Playback

```javascript
const manager = YSSessionManager.createForVoD(vmapUrl, {}, (result, status) => {
    if (result === 'ready') {
        // Get the modified playlist URL
        const playlistUrl = manager.masterPlaylist();

        // Initialize your video player with playlistUrl
        player.load(playlistUrl);

        // Register player callbacks
        manager.registerPlayer({
            UpdateTimeline: (timeline) => { /* Update scrubbar */ },
            AdBreakStart: (adBreak) => { /* Show ad UI */ },
            AdBreakEnd: (adBreak) => { /* Hide ad UI */ },
            AdvertStart: (mediaId) => { /* Ad started */ },
            AdvertEnd: (mediaId) => { /* Ad ended */ },
            AnalyticsFired: (event, data) => { /* Tracking sent */ }
        });
    }
});

// Report playhead position continuously
setInterval(() => {
    manager.reportPlayerEvent('position', player.currentTime);
}, 250);
```

### Live Playback

```javascript
const manager = YSSessionManager.createForLive(streamUrl, {}, (result) => {
    if (result === 'ready') {
        const playlistUrl = manager.masterPlaylist();
        player.load(playlistUrl);
        manager.registerPlayer(playerCallbacks);
    }
});

// Report ID3 metadata when received
player.on('id3', (data) => {
    manager.reportPlayerEvent('id3', data);
});

// Or parse raw ID3 bytes
player.on('id3raw', (bytes) => {
    manager.RawID3(bytes);
});
```

### Live Pause (DVR)

```javascript
const manager = YSSessionManager.createForLivePause(streamUrl, {}, callback);
```

## API Reference

### YSSessionManager

The main entry point for creating and managing ad sessions.

#### Factory Methods

| Method | Description |
|--------|-------------|
| `createForVoD(url, properties, callback)` | Create a VOD session |
| `createForLive(url, properties, callback)` | Create a live session |
| `createForLivePause(url, properties, callback)` | Create a DVR session |
| `createForNonLinear(url, properties, callback)` | Create a VLive session |

#### Instance Methods

| Method | Description |
|--------|-------------|
| `registerPlayer(player)` | Register player callback object |
| `reportPlayerEvent(event, data)` | Report a player event |
| `masterPlaylist()` | Get the modified playlist URL |
| `getTimeline()` | Get the current timeline |
| `getVersion()` | Get SDK version |
| `isYospaceStream()` | Check if stream is Yospace-enabled |
| `shutdown()` | Clean up and destroy session |
| `RawID3(data)` | Parse raw ID3 tag bytes |

#### Configuration Properties

```javascript
{
    LOW_FREQ: 4000,     // Analytics poll interval (ms) - normal
    HIGH_FREQ: 500,     // Analytics poll interval (ms) - during ads
    AD_DEBUG: false,    // Enable ad diagnostics
    DEBUGGING: false    // Enable debug logging
}
```

### Player Events

Report these events via `reportPlayerEvent(event, data)`:

| Event | Data | Description |
|-------|------|-------------|
| `position` | `number` | Current playhead position (seconds) |
| `start` | - | Playback started |
| `complete` | - | Playback ended |
| `pause` | - | Playback paused |
| `resume` | - | Playback resumed |
| `mute` | `boolean` | Mute state changed |
| `fullscreen` | `boolean` | Fullscreen state changed |
| `id3` | `object` | ID3 metadata received (live) |
| `click` | - | User clicked on ad |
| `buffer` | - | Playback stalled |
| `continue` | - | Playback resumed from stall |

### Player Callbacks

Register these via `registerPlayer()`:

```javascript
{
    UpdateTimeline(timeline)      // Timeline updated
    AdBreakStart(adBreak)         // Ad break starting
    AdBreakEnd(adBreak)           // Ad break ended
    AdvertStart(mediaId)          // Individual ad starting
    AdvertEnd(mediaId)            // Individual ad ended
    AnalyticsFired(event, data)   // Tracking beacon sent
}
```

### Session Results

| Value | Description |
|-------|-------------|
| `ready` | Session initialized successfully |
| `error` | Session failed to initialize |
| `no-analytics` | Stream is not Yospace-enabled |

### Session Status Codes

| Code | Description |
|------|-------------|
| `-1` | Connection error |
| `-2` | Connection timeout |
| `-3` | Malformed URL |
| `-10` | Non-Yospace URL |
| `-11` | No live pause support |

## Timeline API

The timeline represents the full playback duration with content and ad segments.

```javascript
const timeline = manager.getTimeline();

// Get all elements
const elements = timeline.getAllElements();

// Get element at specific time
const element = timeline.getElementAtTime(position);

// Get total duration
const duration = timeline.getTotalDuration();
```

### Timeline Elements

| Type | Description |
|------|-------------|
| `vod` | Content segment |
| `advert` | Ad break segment |
| `live` | Live content segment |

## Policy API

Control playback restrictions during ads:

```javascript
const policy = session.getPolicy();

policy.canSeekTo(position)  // Returns allowed seek position
policy.canPause()           // Can pause playback?
policy.canSeek()            // Can seek?
policy.canSkip()            // Returns skip countdown or -1
policy.canMute()            // Can mute?
policy.canClickThrough()    // Can click ad?
```

## Ad Break Structure

```javascript
{
    adBreakIdentifier: string,   // Break ID
    adBreakDescription: string,  // Break type (e.g., "linear")
    startPosition: number,       // Start time (seconds)
    adverts: YSAdvert[],         // Array of ads

    getDuration()                // Total break duration
    isActive()                   // Any ads currently active?
    getAdvertForPosition(pos)    // Get ad at position
}
```

## Advert Structure

```javascript
{
    duration: number,            // Ad duration (seconds)
    isActive: boolean,           // Currently playing?

    getMediaID()                 // Unique media identifier
    getAdvertID()                // Ad ID
    getCreativeID()              // Creative ID
    isFiller()                   // Is filler ad?
    hasInteractiveUnit()         // Has VPAID?
    timeElapsed()                // Time played (seconds)
}
```

## Tracking Events

The SDK automatically fires these VAST tracking events:

| Event | When |
|-------|------|
| `creativeView` | Ad starts rendering |
| `start` | Ad playback begins |
| `firstQuartile` | 25% complete |
| `midpoint` | 50% complete |
| `thirdQuartile` | 75% complete |
| `complete` | Ad finished |
| `pause` | Ad paused |
| `resume` | Ad resumed |
| `mute` / `unmute` | Audio state changed |
| `fullscreen` / `exitFullscreen` | Fullscreen changed |
| `click` | User clicked ad |

## ID3 Metadata (Live)

For live streams, the SDK parses ID3 tags with Yospace metadata:

| Tag | Description |
|-----|-------------|
| `YMID` | Media ID |
| `YTYP` | Type (S=Start, E=End) |
| `YSEQ` | Sequence (e.g., "1:3" = 1 of 3) |

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- IE11 (with polyfills)

## Files

| File | Description |
|------|-------------|
| `yo-ad-management.min.js` | Minified production build (93KB) |
| `yo-ad-management.js` | Unminified source with comments (192KB) |

## License

Proprietary - Yospace Technologies Ltd.
