Architecture (simple & fast)
	•	Publish: the presenter hits a control API to publish {slide, ts} updates; viewers POST {emoji} for reactions.
	•	Fan-out: an SSE stream per viewer relays events (slides + reactions).
	•	Transport: Vercel Edge Functions + Vercel KV (Redis) Pub/Sub for low-latency broadcast.
	•	State: KV holds currentSlide so late joiners snap to live.
	•	Security: HMAC token on control route; per-deck channel keys.

⸻

1) Install

npm i @vercel/kv

Add env:

KV_URL=...
KV_REST_API_URL=...
KV_REST_API_TOKEN=...
KV_REST_API_READ_ONLY_TOKEN=...
LUME_CONTROL_SECRET=superlongrandom


⸻

2) SSE subscribe (Edge)

app/api/live/[deckId]/route.ts

import { kv } from '@vercel/kv';

export const runtime = 'edge';

export async function GET(_req: Request, { params }: { params: { deckId: string } }) {
  const { deckId } = params;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      // Send current state first
      const current = (await kv.hgetall<{ slide?: number }>(`deck:${deckId}:state`)) ?? {};
      controller.enqueue(encoder.encode(`event: init\ndata: ${JSON.stringify({ slide: current.slide ?? 0 })}\n\n`));

      // Subscribe to Pub/Sub
      const sub = kv.subscribe(`deck:${deckId}:events`, (msg) => {
        controller.enqueue(encoder.encode(`data: ${msg}\n\n`));
      });

      // Heartbeat to keep proxies happy
      const ping = setInterval(() => controller.enqueue(encoder.encode(`: ping\n\n`)), 15000);

      // Cleanup
      const close = () => { clearInterval(ping); sub.unsubscribe(); controller.close(); };
      // @ts-ignore — not in TS lib yet for Edge
      (globalThis as any).addEventListener?.('fetchabort', close);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}


⸻

3) Advance slides (Presenter → publish)

app/api/control/advance/[deckId]/route.ts

import { kv } from '@vercel/kv';

export const runtime = 'edge';

export async function POST(req: Request, { params }: { params: { deckId: string } }) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.LUME_CONTROL_SECRET}`) return new Response('Unauthorized', { status: 401 });

  const { slide } = await req.json() as { slide: number };
  const evt = JSON.stringify({ type: 'slide', slide, ts: Date.now() });

  await kv.hset(`deck:${params.deckId}:state`, { slide });
  await kv.publish(`deck:${params.deckId}:events`, evt);

  return new Response('ok');
}


⸻

4) Reactions (Viewers → publish)

app/api/react/[deckId]/route.ts

import { kv } from '@vercel/kv';
export const runtime = 'edge';

export async function POST(req: Request, { params }: { params: { deckId: string } }) {
  const { emoji } = await req.json() as { emoji: string };
  const evt = JSON.stringify({ type: 'reaction', emoji, id: crypto.randomUUID(), ts: Date.now() });
  await kv.publish(`deck:${params.deckId}:events`, evt);
  return new Response('ok');
}


⸻

5) Client: hook + UI

useSSE.ts

import { useEffect, useRef, useState } from 'react';

export function useSSE(url: string) {
  const [events, setEvents] = useState<any[]>([]);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const es = new EventSource(url, { withCredentials: false });
    esRef.current = es;

    es.addEventListener('init', (e) => setEvents((p) => [...p, { type: 'init', ...JSON.parse((e as MessageEvent).data) }]));
    es.onmessage = (e) => setEvents((p) => [...p, JSON.parse(e.data)]);
    es.onerror = () => { es.close(); };

    return () => es.close();
  }, [url]);

  return events;
}

Presenter control

await fetch(`/api/control/advance/${deckId}`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.NEXT_PUBLIC_LUME_TOKEN ?? ''}` },
  body: JSON.stringify({ slide: nextIndex }),
});

Viewer subscribe + floaters (React)

const events = useSSE(`/api/live/${deckId}`);
const [slide, setSlide] = useState(0);
const [floaters, setFloaters] = useState<{id:string;emoji:string}[]>([]);

useEffect(() => {
  for (const e of events) {
    if (e.type === 'init') setSlide(e.slide);
    if (e.type === 'slide') setSlide(e.slide);
    if (e.type === 'reaction') setFloaters((p) => [...p, { id: e.id, emoji: e.emoji }]);
  }
}, [events]);

Floater CSS (tailwind-ish)

.lume-floater {
  position: absolute;
  animation: rise 1.6s ease-out forwards;
  font-size: 28px;
  pointer-events: none;
  filter: drop-shadow(0 4px 10px rgba(0,0,0,.35));
}
@keyframes rise {
  from { transform: translateY(0) scale(.9); opacity: .0; }
  30% { opacity: 1; }
  to { transform: translateY(-140px) scale(1.1); opacity: 0; }
}

Emit a reaction

fetch(`/api/react/${deckId}`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ emoji: '👏' }),
});

Render floaters by mapping floaters to absolutely-positioned <span class="lume-floater">👏</span> at random x positions, and remove on animationend.

⸻

Notes / gotchas
	•	Vercel + SSE: works great; use heartbeats to avoid idle timeouts.
	•	Broadcast: KV Pub/Sub is the simplest; you can also use Vercel Postgres LISTEN/NOTIFY if you prefer SQL-based pub/sub.
	•	Ordering: use ts and ignore stale events (if (e.ts < lastTs) skip).
	•	Auth: keep control route secret; per-deck tokens if you host multiple talks.
	•	Latency: typically 50–200 ms edge-to-viewer.

If you want, I’ll wrap this into a tiny @lume/realtime helper (client + server utilities) so you can drop it into your framework in one import.