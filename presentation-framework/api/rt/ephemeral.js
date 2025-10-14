export const config = { runtime: 'edge' };

export default async function handler(req) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY not configured');
      return json(500, {
        error: 'OPENAI_API_KEY not configured',
        details: 'Please add OPENAI_API_KEY to your .env.local file',
      });
    }

    // Get threshold from query params or body
    const url = new URL(req.url);
    let threshold = 50;
    const qp = url.searchParams.get('threshold');
    if (qp) threshold = Number.parseInt(qp);
    else if (req.method === 'POST') {
      const body = await safeJson(req);
      if (body?.threshold != null) threshold = Number.parseInt(String(body.threshold));
    }
    if (!Number.isFinite(threshold)) threshold = 50;
    threshold = Math.min(95, Math.max(35, threshold)); // clamp 35-95%

    console.log('Creating ephemeral session with threshold:', threshold + '%');

    const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-realtime-preview-2024-12-17',
        voice: 'verse',
        modalities: ['text', 'audio'],

        instructions: `You control slide auto-advance during a live talk. Be early, never late.

CONTEXT
- You receive slide context via set_context(slide_index, notes_text, notes_word_count, target_WPM).

PROGRESS REPORTING (high frequency)
- Emit update_progress every 0.3-0.5s while speaker talks.
- Each call: progress_percent (0-100 integer), covered_points (under 8 words).
- Compute: literal_ratio = spoken_words / notes_words, semantic_ratio = meaning coverage
- progress_percent = ceil(100 * max(literal_ratio, semantic_ratio))
- Monotonic: never decrease. Round UP (46% -> 50%).
- Small steady bumps (+2-4%) each tick.

TIMING
- observed_wpm = words in last 5s / 5 * 60
- pace_wpm = max(observed_wpm, target_WPM)
- seconds_remaining = (notes_words - spoken_words) / pace_wpm * 60

ADVANCE RULES (FIRST WINS)
1. If progress_percent >= ${threshold}%, IMMEDIATELY call advance_slide
2. If seconds_remaining <= 5s, IMMEDIATELY call advance_slide
3. After advance_slide, pause until new set_context

SAFETY
- One advance per slide
- No punctuation in parameters
- Be generous with paraphrase`,

        tools: [
          {
            type: 'function',
            name: 'set_context',
            description: 'Slide context. Client calls this when slide changes.',
            parameters: {
              type: 'object',
              properties: {
                slide_index: { type: 'integer' },
                notes_text: { type: 'string' },
                notes_word_count: { type: 'integer' },
                target_WPM: { type: 'number' },
              },
              required: ['slide_index', 'notes_text', 'notes_word_count', 'target_WPM'],
            },
          },
          {
            type: 'function',
            name: 'update_progress',
            description: 'Report progress every 0.3-0.5s',
            parameters: {
              type: 'object',
              properties: {
                progress_percent: { type: 'number' },
                covered_points: { type: 'string' },
              },
              required: ['progress_percent', 'covered_points'],
            },
          },
          {
            type: 'function',
            name: 'advance_slide',
            description: `Advance NOW when progress >= ${threshold}% or <=5s remaining`,
            parameters: {
              type: 'object',
              properties: { reason: { type: 'string' } },
              required: ['reason'],
            },
          },
        ],
        tool_choice: 'auto',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI session creation failed:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      return json(502, { error: 'openai_error', status: response.status, details: errorText });
    }

    const data = await response.json();
    console.log('✅ Ephemeral session created:', data.id);
    return json(200, data);
  } catch (error) {
    console.error('Ephemeral endpoint error:', error);
    return json(500, { error: String(error?.message ?? error), stack: String(error?.stack ?? '') });
  }
}

// Helper functions
async function safeJson(req) {
  try { return await req.json(); } catch { return null; }
}

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
