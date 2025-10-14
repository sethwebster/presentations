# Lume Realtime Features

Live presentation synchronization and emoji reactions powered by Server-Sent Events (SSE) and Vercel KV.

## Features

- **Live Slide Sync**: Presenter advances slides, all viewers follow in real-time
- **Emoji Reactions**: Viewers send emoji reactions that float up on everyone's screen
- **Late Joiner Support**: New viewers automatically sync to current slide
- **Low Latency**: ~50-200ms using Vercel Edge Functions + KV pub/sub

## Setup

### 1. Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Fill in your Vercel KV credentials (get from Vercel dashboard):

```env
KV_URL=your_kv_url
KV_REST_API_URL=your_api_url
KV_REST_API_TOKEN=your_token
KV_REST_API_READ_ONLY_TOKEN=your_readonly_token
LUME_CONTROL_SECRET=generate_a_long_random_secret
VITE_LUME_CONTROL_SECRET=same_secret_as_above
```

### 2. Deploy to Vercel

The API routes are Vercel Edge Functions and need to be deployed:

```bash
vercel deploy
```

## Usage

### As Presenter

Navigate to your presentation with a deck ID:

```
https://your-app.vercel.app/present/my-deck?deckId=unique-deck-name
```

Your slide changes will automatically broadcast to all viewers.

### As Viewer

Use the same deck ID:

```
https://your-app.vercel.app/present/my-deck?deckId=unique-deck-name&viewer=true
```

Viewers will:
- Automatically sync to presenter's current slide
- See emoji reactions from other viewers
- Can send their own emoji reactions

### Sending Reactions

Viewers can send emoji reactions by pressing keys or clicking reaction buttons (to be implemented in UI).

## API Routes

### `/api/live/[deckId]`
SSE stream for realtime updates
- Returns: `text/event-stream`
- Events: `init`, `slide`, `reaction`

### `/api/control/advance/[deckId]`
Presenter control to advance slides
- Method: `POST`
- Auth: `Bearer {LUME_CONTROL_SECRET}`
- Body: `{ slide: number }`

### `/api/react/[deckId]`
Send emoji reaction
- Method: `POST`
- Body: `{ emoji: string }`

## Client Hooks

### `useSSE(url)`
Subscribe to server-sent events
- Returns array of events

### `useRealtimePresentation(deckId, currentSlide, goToSlide, isPresenter)`
Complete realtime integration
- Handles slide sync
- Processes reactions
- Provides `publishSlideChange` and `sendReaction` functions

## Components

### `<EmojiFloaters reactions={reactions} />`
Renders animated emoji reactions that float up the screen

## Architecture

```
Presenter                    Vercel KV (Redis)              Viewers
    |                              |                           |
    |-- POST /control/advance --→ |                           |
    |                              |-- pub/sub broadcast --→   |
    |                              |                           |
    |                              |←-- GET /api/live --------←|
    |                              |                           |
    |                              |←-- POST /api/react ------←|
    |←----- emoji floaters --------|----- emoji floaters -----→|
```

## Security

- Presenter control requires `LUME_CONTROL_SECRET`
- Per-deck isolation using unique deck IDs
- Reactions are public (no auth required)

## Performance

- Edge Functions for low latency (~50-200ms)
- KV pub/sub for efficient broadcasting
- Heartbeat every 15s to keep connections alive
- Automatic cleanup on disconnect

## Next Steps

- [ ] Add reaction button UI for viewers
- [ ] Add presenter controls panel
- [ ] Add viewer count display
- [ ] Add deck management UI
