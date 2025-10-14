export const config = {
  runtime: 'edge',
};

export default async function handler() {
  try {
    // Check if API key is configured
    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY not configured');
      return new Response(JSON.stringify({
        error: 'OPENAI_API_KEY not configured',
        details: 'Please add OPENAI_API_KEY to your .env.local file'
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    console.log('Creating ephemeral session...');

    const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-realtime-preview-2024-12-17',
        voice: 'verse',
        modalities: ['text', 'audio'],
        instructions: `You are controlling slide auto-advance for a live talk. You must be EARLY, not perfect.

CADENCE & LATENCY
- Emit update_progress EVERY 1.0 second while the speaker is talking, even if the value barely changes.
- Keep tool calls small; avoid verbose strings. Prefer terse summaries (5-12 words max).

EARLY ADVANCE RULES (FIRST-HIT WINS):
- If progress >= 50%, IMMEDIATELY call advance_slide. Do not wait to be surer.
- If seconds_remaining <= 2.5s (based on pace and notes length), IMMEDIATELY call advance_slide.
- If both apply, advance once (idempotent).

PROGRESS ESTIMATION
- Be generous: paraphrase counts. Summarize essence, not exact wording.
- Consider overlap with notes: if the essence is covered, count it.
- Never decrease progress. Progress is monotonic (only goes up).
- Round UP optimistically: 46%? Call it 50% and advance.

EXAMPLES
- Notes ≈ 120 words, pace 150 WPM → ~48s total. At ~24s (≈50%), CALL advance_slide.
- Progress 46-49% and moving quickly? Round to 50% and CALL advance_slide.
- Seconds_remaining = 2.3s? CALL advance_slide immediately.
- After advance_slide, pause updates until new set_context arrives.`,
        tools: [
          {
            type: 'function',
            name: 'set_context',
            description: 'Slide context with timing info. Client calls this when slide changes.',
            parameters: {
              type: 'object',
              properties: {
                slide_index: { type: 'integer' },
                notes_text: { type: 'string' },
                notes_word_count: { type: 'integer' },
                target_wpm: {
                  type: 'number',
                  description: 'Estimated speaking pace (words per minute)',
                },
              },
              required: ['slide_index', 'notes_text', 'notes_word_count', 'target_wpm'],
            },
          },
          {
            type: 'function',
            name: 'update_progress',
            description: 'Report progress every ~1s while speaker talks.',
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
            description: 'Advance NOW. Must be called ASAP when progress >= 50% or seconds_remaining <= 2.5s.',
            parameters: {
              type: 'object',
              properties: {
                reason: { type: 'string' },
              },
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

      return new Response(JSON.stringify({
        error: 'openai_error',
        status: response.status,
        details: errorText,
      }), {
        status: 502,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    const data = await response.json();
    console.log('✅ Ephemeral session created:', data.id);

    return new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Ephemeral endpoint error:', error);
    return new Response(JSON.stringify({
      error: error.message,
      stack: error.stack,
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}
