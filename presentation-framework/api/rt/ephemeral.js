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
        instructions: `You are assisting a live presentation with automatic slide advancement.

Listen to the speaker and compare what they say to the slide notes provided via session updates.

CRITICAL INSTRUCTIONS:
1. Call update_progress periodically (every 3-5 seconds) to report your assessment of slide completion (0-100%)
2. When progress reaches 80% or the speaker has covered the key points, call advance_slide
3. Be lenient - they don't need to say everything word-for-word, but should cover main ideas
4. Wait for natural pauses or transitions before calling advance_slide

Focus on: Have they covered the main ideas? Have they finished the thought? Would it make sense to advance now?`,
        tools: [
          {
            type: 'function',
            name: 'update_progress',
            description: 'Call this periodically to report how much of the current slide\'s talking points the speaker has covered. Call this every few seconds while they speak.',
            parameters: {
              type: 'object',
              properties: {
                progress_percent: {
                  type: 'number',
                  description: 'Estimated percentage (0-100) of the slide talking points that have been covered',
                },
                covered_points: {
                  type: 'string',
                  description: 'Brief summary of which key points have been covered',
                },
              },
              required: ['progress_percent', 'covered_points'],
            },
          },
          {
            type: 'function',
            name: 'advance_slide',
            description: 'Call this function when the speaker has finished covering the key points of the current slide and is ready to move to the next slide.',
            parameters: {
              type: 'object',
              properties: {
                reason: {
                  type: 'string',
                  description: 'Brief reason why you think the slide should advance',
                },
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
