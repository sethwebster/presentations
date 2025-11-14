/**
 * API Route: POST /api/ai/refine-notes
 * Conversational AI refinement of speaker notes
 */

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";
export const maxDuration = 60;

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface RefineNotesRequest {
  currentNotes: string;
  slideTitle?: string;
  slideContent?: string;
  userRequest: string;
  conversationHistory: Message[];
}

export async function POST(req: NextRequest) {
  try {
    const body: RefineNotesRequest = await req.json();
    const { currentNotes, slideTitle, slideContent, userRequest, conversationHistory } = body;

    // Validate required fields
    if (!userRequest) {
      return NextResponse.json(
        { error: "Missing required field: userRequest" },
        { status: 400 }
      );
    }

    // Get OpenAI API key
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      );
    }

    const openai = new OpenAI({ apiKey });

    // Build conversation context
    const systemPrompt = `You are an expert presentation coach helping refine speaker notes.

**Context:**
Slide Title: ${slideTitle || 'Untitled'}
Slide Content: ${slideContent || 'No content'}

**Current Speaker Notes:**
\`\`\`markdown
${currentNotes || '(No notes yet)'}
\`\`\`

**Your Role:**
- Help the user improve their presenter notes through conversation
- Provide specific, actionable suggestions
- Support markdown formatting (**bold**, bullets, > blockquotes)
- Focus on delivery cues, timing, transitions, audience engagement
- Keep notes concise and actionable (max 600 chars)
- Maintain the user's voice and style

**Guidelines:**
- When the user asks for changes, apply them and return the refined notes
- Use markdown formatting to structure the notes
- Include sections like **Opening**, **Key Points**, **Transitions**, **Timing**
- Add delivery cues in > blockquotes for emphasis
- Use bullet points (- ) for talking points
- Be conversational and helpful

**Important:** When providing refined notes, wrap them in a markdown code block like this:
\`\`\`markdown
your refined notes here
\`\`\`

This helps me extract and apply them correctly.`;

    // Build message history
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.map(msg => ({
        role: msg.role,
        content: msg.content,
      } as OpenAI.Chat.ChatCompletionMessageParam)),
      { role: 'user', content: userRequest },
    ];

    // Call OpenAI
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      temperature: 0.7,
      max_tokens: 1000,
    });

    const assistantResponse = response.choices[0]?.message?.content || '';

    // Extract refined notes from markdown code block
    const codeBlockMatch = assistantResponse.match(/```(?:markdown)?\s*([\s\S]*?)\s*```/);
    const refinedNotes = codeBlockMatch
      ? codeBlockMatch[1].trim()
      : currentNotes; // Fall back to current notes if no code block found

    return NextResponse.json({
      response: assistantResponse,
      refinedNotes,
    });
  } catch (error) {
    console.error("Refine notes error:", error);
    return NextResponse.json(
      {
        error: "Failed to refine notes",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
