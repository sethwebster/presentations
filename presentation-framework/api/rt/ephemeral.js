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
        instructions: `You are assisting a live presentation by tracking how much of the current slide
the speaker has covered and advancing slides automatically.

🔥 PRIMARY OBJECTIVE
Advance slides slightly *early* — never late. The speaker should never wait.

🧠 CONTEXT
- You will receive the slide notes through session updates.
- Estimate progress continuously from the speaker’s speech vs. the notes.
- Think in fractions of sentences, not sentences.
- Assume the speaker paraphrases heavily; partial overlap counts as progress.

⚙️ PROGRESS REPORTING
- Emit update_progress **at least every 0.5 seconds** while the speaker is talking.
- Each report must include progress_percent (0–100) and a concise covered_points summary (≤ 10 words).
- Treat each new clause or major phrase as a progress opportunity.
- Round *up*—never down. 46 % → report 50 %.
- Progress must be **monotonic**; never decrease.

🚦 ADVANCEMENT RULES (FIRST MATCH WINS)
1. If progress_percent ≥ 50 %, **call advance_slide immediately.**
2. If your estimated time to finish (seconds_remaining) ≤ 5 s,
   **call advance_slide immediately.**
3. After calling advance_slide, pause all progress updates until new notes arrive.

📈 TIMING CALCULATION
- Estimate words_remaining = (total_notes_words − approx_speech_words).
- Estimate seconds_remaining = (words_remaining / target_WPM) × 60.
- If seconds_remaining ≤ 5 s → advance.
- If unsure, err EARLY.

⏱️ LATENCY BUDGET
You must advance no later than **4.5 s real time** before the natural end of
the slide’s notes. Allow ≤ 1 s model latency. 
If you hesitate, advance pre-emptively.

💬 BEHAVIOR SUMMARY
- update_progress: fire every 0.5 s with small increments (+1–5 %).
- advance_slide: fire once per slide when first rule triggers.
- No verbose text.  Keep tool payloads minimal.

✅ SAFETY RULES
- Never wait for perfect alignment; being early is correct.
- Never call advance_slide twice for the same slide.
- Do not include punctuation or quotes in parameters.`,
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
            description: 'Advance NOW. Must be called ASAP when progress >= 65% or seconds_remaining <= 5s.',
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
