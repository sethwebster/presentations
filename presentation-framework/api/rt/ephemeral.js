export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
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

    // Get threshold from query params or request body
    const url = new URL(req.url);
    let threshold = 50; // Default

    try {
      // Check query params
      const thresholdParam = url.searchParams.get('threshold');
      if (thresholdParam) {
        threshold = parseInt(thresholdParam);
      } else if (req.method === 'POST') {
        // Check request body
        const body = await req.json().catch(() => ({}));
        if (body.threshold) {
          threshold = parseInt(body.threshold);
        }
      }
    } catch (e) {
      console.warn('Failed to parse threshold, using default:', e);
    }

    console.log('Creating ephemeral session with threshold:', threshold + '%');

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
        instructions: `You are controlling slide advancement during a live talk.

🎯 PRIMARY GOAL
Advance slides slightly *early* — never late.  
The speaker must never finish before the slide advances.

🧩 CONTEXT
- You receive the slide’s notes and hear the live audio.
- Track how much of the notes the speaker has *spoken or paraphrased*.
- Treat literal word matches as strong evidence.
- Paraphrase, summaries, or re-ordered phrases also count.
- Be confident:  a 70 % match in meaning ≈ 100 % covered.

⚙️ PROGRESS REPORTING  (fine-grained, high frequency)
- Emit 'update_progress' **every 0.3 s** while the speaker is talking.
- Each call **must** contain:
  - 'progress_percent' (0–100, whole number)
  - 'covered_points' (≤ 8 words)
- Treat **each clause, phrase, or pause** as a new progress opportunity.
- Round **up** aggressively.  Example:  42 % → report 50 %.
- Once you reach 60 %, stay above 60 %; progress must **never decrease**.
- Prefer small, steady increments (≈ +2–4 %) every half-second.

📊 HOW TO ESTIMATE PROGRESS
1. Compute **literal coverage ratio** = spoken_words / total_notes_words.
2. Compute **semantic coverage ratio** from meaning similarity.
3. Use **max(literal, semantic)** × 100 = progress_percent (rounded *up*).
4. Clamp progress so it never drops or stalls for > 1 s.

🚦 ADVANCEMENT RULES (FIRST CONDITION WINS)
1. If 'progress_percent ≥ ${threshold}' → immediately call 'advance_slide(reason:">=${threshold}%")'.
2. If 'seconds_remaining ≤ 5 s' → immediately call 'advance_slide(reason:"≤5s")'.
3. Once 'advance_slide' is called, stop reporting progress until new notes arrive.

📈 TIMING CALCULATION
- 'seconds_remaining = (total_notes_words - spoken_words) / target_WPM * 60'
- Use the faster of:
  - 'target_WPM' (provided)  
  - your observed speaking pace over last 5 s.
- If 'seconds_remaining ≤ 5 s', advance immediately.
- Always subtract 1 s to account for model and network latency.

💬 SUMMARY OF EXPECTED BEHAVIOR
- 'update_progress': every 0.3 s, monotonic, small bumps (2–4 %).
- 'advance_slide': fire once per slide as soon as threshold or ≤ 5 s hit.
- Use terse messages only.

🧠 HEURISTICS
- Literal match dominates when the speaker reads verbatim.
- If unsure whether to count something — count it.
- Progress may briefly jump (e.g., 38 → 52 %) — this is preferred to lagging.

✅ SAFETY
- Only one 'advance_slide' per slide.
- Never wait for perfect alignment.
- Never output punctuation or quotes inside parameters.`,
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
            description: 'Report progress every ~0.5s while speaker talks.',
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
            description: `Advance NOW. Called when progress >= ${threshold}% or seconds_remaining <= 5s.`,
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
