import { kv } from '@vercel/kv';

export const config = {
  runtime: 'edge',
};

export async function GET(req) {
  const url = new URL(req.url);
  const pathParts = url.pathname.split('/');
  const deckId = pathParts[pathParts.length - 1];
  const encoder = new TextEncoder();

  console.log('SSE connection request for deck:', deckId);

  try {
    const stream = new ReadableStream({
      async start(controller) {
        let pingInterval;

        try {
          // Send current state first
          console.log('Fetching initial state for deck:', deckId);
          const current = await kv.hgetall(`deck:${deckId}:state`) || {};
          const initData = JSON.stringify({ slide: current.slide ?? 0 });
          controller.enqueue(encoder.encode(`event: init\ndata: ${initData}\n\n`));
          console.log('Sent init event:', initData);

          // Heartbeat to keep stream alive
          pingInterval = setInterval(() => {
            try {
              controller.enqueue(encoder.encode(`: ping\n\n`));
            } catch (e) {
              clearInterval(pingInterval);
            }
          }, 15000);

          // Poll for state and reactions
          let lastSlide = current.slide ?? 0;
          let processedReactionIds = new Set();
          let pollDelay = 500;
          let consecutiveNoChanges = 0;

          const poll = async () => {
            try {
              const state = await kv.hgetall(`deck:${deckId}:state`) || {};
              const currentSlide = state.slide ?? 0;
              let hasChanges = false;

              // Check for slide changes
              if (currentSlide !== lastSlide) {
                const slideEvent = JSON.stringify({ type: 'slide', slide: currentSlide, ts: Date.now() });
                controller.enqueue(encoder.encode(`data: ${slideEvent}\n\n`));
                lastSlide = currentSlide;
                hasChanges = true;
                console.log('Slide changed:', currentSlide);
              }

              // Check for new reactions
              const reactions = await kv.lrange(`deck:${deckId}:reactions`, 0, -1) || [];
              for (const reactionStr of reactions) {
                const reaction = JSON.parse(reactionStr);
                if (!processedReactionIds.has(reaction.id)) {
                  controller.enqueue(encoder.encode(`data: ${reactionStr}\n\n`));
                  processedReactionIds.add(reaction.id);
                  hasChanges = true;
                  console.log('Sent reaction:', reaction.emoji);
                }
              }

              // Adaptive polling interval
              if (hasChanges) {
                pollDelay = 300;
                consecutiveNoChanges = 0;
              } else {
                consecutiveNoChanges++;
                if (consecutiveNoChanges > 3) {
                  pollDelay = Math.min(pollDelay * 1.2, 2000);
                }
              }

              setTimeout(poll, pollDelay);
            } catch (e) {
              console.error('Poll error:', e);
              setTimeout(poll, 2000);
            }
          };

          poll();

          // Cleanup on disconnect
          req.signal?.addEventListener('abort', () => {
            console.log('SSE connection closed for deck:', deckId);
            clearInterval(pingInterval);
            controller.close();
          });

        } catch (err) {
          console.error('SSE stream error:', err, err.message, err.stack);
          if (pingInterval) clearInterval(pingInterval);
          try {
            controller.error(err);
          } catch (e) {
            // Controller might already be closed
          }
        }
      },

      cancel() {
        console.log('SSE stream cancelled for deck:', deckId);
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (err) {
    console.error('SSE setup error:', err, err.message, err.stack);
    return new Response(JSON.stringify({ error: err.message, stack: err.stack }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });
  }
}
