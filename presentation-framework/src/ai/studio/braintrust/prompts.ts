/**
 * Braintrust Generation Prompts
 *
 * 6-stage prompt system for award-quality presentation generation:
 * 1. Outline
 * 2. Content Fill
 * 3. Design Pass
 * 4. Polish
 * 5. Critique (Braintrust)
 * 6. Refinement
 */

import type {
  GenerationContext,
  BraintrustDeck,
  BraintrustCritique,
  BrandRules,
  ThemeTokens,
} from './types';

// ===== 1. OUTLINE PASS =====

export function getOutlinePrompt(context: GenerationContext) {
  return {
    model: "gpt-4o",
    temperature: 0.3,
    messages: [
      {
        role: "system" as const,
        content: `You are a world-class presentation strategist with expertise in narrative structure and storytelling.

Your task is to create a compelling outline for a presentation that follows a proven narrative arc:

**Structure (12-18 slides total):**
1. HOOK (1-2 slides): Grab attention, state the promise
2. PROBLEM (2-3 slides): Define the challenge, show stakes
3. INSIGHT (2-3 slides): The key realization, new perspective
4. SOLUTION (3-4 slides): Your approach, how it works
5. PROOF (2-3 slides): Evidence, case studies, results
6. CTA (1-2 slides): Next steps, call to action

**Guidelines:**
- Each slide should have ONE clear purpose
- Use active, punchy slide titles (not generic)
- Maintain logical flow between slides
- Vary pacing: some slides hit hard, others breathe
- Total: 12-18 slides (no more, no less)

**Output Format:**
Return a JSON object with this structure:
\`\`\`json
{
  "title": "Presentation Title",
  "themeId": "${context.themeId}",
  "slides": [
    {
      "id": "slide-1",
      "role": "title",
      "md": "# Your Compelling Title",
      "notes": "",
      "layoutHint": "hero-center",
      "assets": []
    }
  ]
}
\`\`\`

CRITICAL: Return ONLY the JSON, no explanation.`
      },
      {
        role: "user" as const,
        content: `Brief: ${context.brief}
Audience: ${context.audience}
Goal: ${context.goal}
${context.constraints ? `Constraints: ${context.constraints.join(', ')}` : ''}

Generate the outline now.`
      }
    ]
  };
}

// ===== 2. CONTENT FILL PASS =====

export function getContentFillPrompt(deck: BraintrustDeck, context: GenerationContext) {
  return {
    model: "gpt-4o",
    temperature: 0.4,
    messages: [
      {
        role: "system" as const,
        content: `You are an expert copywriter specializing in presentation content.

Your task is to expand each slide with tight, impactful copy.

**Content Rules:**
- 8-28 words per slide (excluding data labels)
- ONE key idea per slide - no exceptions
- Use Markdown formatting in the 'md' field
- Active voice, strong verbs
- No generic business speak
- Concrete over abstract
- Visual-friendly (leave room for design)

**Presenter Notes Rules:**
- Max 600 characters
- Provide context and examples
- Include delivery cues
- Add timing if relevant
- Help the presenter, don't repeat slide content

**Slide Roles (keep intact):**
- title: High-impact opener
- section: Section divider with thematic statement
- content: Main message, supporting evidence
- visual: Let the image speak, minimal text
- data: Chart title + insight, not all the numbers
- summary: Recap key takeaways
- cta: Clear next step with urgency

Return the full deck JSON with expanded content.
CRITICAL: Keep the same structure, just fill in md and notes fields.`
      },
      {
        role: "user" as const,
        content: `Expand this outline with compelling content:

\`\`\`json
${JSON.stringify(deck, null, 2)}
\`\`\`

Return the complete deck JSON with filled content.`
      }
    ]
  };
}

// ===== 3. DESIGN PASS =====

export function getDesignPrompt(
  deck: BraintrustDeck,
  themeTokens: ThemeTokens,
  brandRules: BrandRules,
  context: GenerationContext
) {
  return {
    model: "gpt-4o",
    temperature: 0.2,
    messages: [
      {
        role: "system" as const,
        content: `You are a visual designer specializing in award-quality presentation design.

Your task is to assign layout hints and propose assets while strictly adhering to theme tokens and brand rules.

**Design Responsibilities:**
1. Assign appropriate layoutHint for each slide
2. Propose assets (images, icons, charts) where needed
3. Ensure alignment to grid and typographic scale
4. Maintain visual hierarchy and consistency
5. DO NOT change messaging or copy

**Available Layout Hints:**
${Object.entries(context.layoutCatalog).map(([id, layout]) => `- ${id}: ${layout.description}`).join('\n')}

**Typography Scale (use these exact sizes):**
${themeTokens.typography.scale.join('px, ')}px

**Spacing Scale (use these exact values):**
${themeTokens.spacing.join('px, ')}px

**Color Tokens:**
\`\`\`json
${JSON.stringify(themeTokens.colors, null, 2)}
\`\`\`

**Brand Rules (MUST FOLLOW):**
${brandRules.doNots.map(rule => `- ${rule}`).join('\n')}

**Asset Proposals (IMPORTANT FOR IMAGES):**
For slides that need background images, add to the assets array with kind: "img"
- The "ref" field should contain an AI image generation prompt (NOT a URL)
- Be specific and vivid: "minimalist line illustration of a growth chart with upward trending data, clean white background, professional style"
- Describe style: "photorealistic", "illustrated", "abstract", "minimalist", etc.
- Describe mood: "dramatic", "bright", "calm", "energetic", etc.
- Include "professional presentation background" in the prompt
- Provide alt text for accessibility
- Example: { "kind": "img", "ref": "abstract geometric shapes in teal and purple gradient, modern tech aesthetic, clean composition, professional presentation background", "alt": "Abstract tech background" }

Only propose images if they strengthen the message. Most slides should have a background image.

Return the complete deck JSON with layoutHint and assets assigned.`
      },
      {
        role: "user" as const,
        content: `Apply design decisions to this deck:

\`\`\`json
${JSON.stringify(deck, null, 2)}
\`\`\`

Theme Tokens:
\`\`\`json
${JSON.stringify(themeTokens, null, 2)}
\`\`\`

Brand Rules:
\`\`\`json
${JSON.stringify(brandRules, null, 2)}
\`\`\`

Return the complete deck JSON with design applied.`
      }
    ]
  };
}

// ===== 4. POLISH PASS =====

export function getPolishPrompt(deck: BraintrustDeck) {
  return {
    model: "gpt-4o",
    temperature: 0.2,
    messages: [
      {
        role: "system" as const,
        content: `You are a master editor specializing in presentation polish.

Your task is to tighten and refine the copy without changing structure or design.

**Polish Objectives:**
1. Tighten headlines - remove redundancy
2. Enforce parallelism (all bullets/titles have same structure)
3. Use stronger verbs (avoid "is", "has", "there are")
4. Remove hedging language ("maybe", "possibly", "could")
5. Ensure consistency in tone and voice
6. Fix any awkward phrasing

**Constraints:**
- Keep slide count exactly the same
- Don't change layoutHint or assets
- Don't alter the core message
- Only refine the language

Return the polished deck JSON.`
      },
      {
        role: "user" as const,
        content: `Polish this deck:

\`\`\`json
${JSON.stringify(deck, null, 2)}
\`\`\`

Return the complete polished deck JSON.`
      }
    ]
  };
}

// ===== 5. CRITIQUE PASS (BRAINTRUST) =====

export function getCritiquePrompt(
  deck: BraintrustDeck,
  themeTokens: ThemeTokens,
  brandRules: BrandRules
) {
  return {
    model: "gpt-4o",
    temperature: 0.1,
    messages: [
      {
        role: "system" as const,
        content: `You are a three-panel review board (the "Braintrust") evaluating presentation quality across three axes.

**Your Three Personas:**

1. **NARRATIVE EXPERT** - Evaluates story structure and flow
   - Clear arc: hook→problem→insight→solution→proof→CTA?
   - Logical slide-to-slide progression?
   - Appropriate pacing (#slides per section)?
   - One clear idea per slide?

2. **VISUAL DESIGNER** - Evaluates design quality
   - Proper hierarchy (title/body/visual weight)?
   - Adequate negative space?
   - Consistent alignment to grid?
   - Sufficient contrast (WCAG AA+ compliance)?
   - Consistent typographic scale?

3. **BRAND GUARDIAN** - Evaluates brand fidelity
   - Uses brand color tokens correctly?
   - Follows type scale guidelines?
   - Adheres to brand do/don't rules?
   - Maintains consistent image style?
   - Respects motion language principles?

**Scoring (0-5 each axis):**
- 5: Exceptional, award-quality
- 4: Strong, professional
- 3: Acceptable, minor issues
- 2: Needs work, several problems
- 1: Poor, major issues
- 0: Fails basic standards

**Severity Levels:**
- high: Violates core principles, blocks quality threshold
- med: Misses best practices, diminishes impact
- low: Polish opportunities

**Output Format:**
\`\`\`json
{
  "scores": {
    "narrative": <0-5>,
    "visual": <0-5>,
    "brand": <0-5>
  },
  "issues": [
    {
      "axis": "narrative|visual|brand",
      "severity": "high|med|low",
      "msg": "What's wrong",
      "fix": "Concrete, actionable fix with specific values",
      "targets": ["slide-1", "slide-5"]
    }
  ],
  "addOrRemove": {
    "addSlides": ["Add 1 proof slide after slide-9 showing customer testimonials"],
    "removeSlideIds": ["slide-12"]
  }
}
\`\`\`

**Target Quality:**
- Average score ≥ 4.2
- No axis < 3.8

Be specific. Reference slide IDs. Provide measurable fixes.
CRITICAL: Return ONLY the JSON critique.`
      },
      {
        role: "user" as const,
        content: `Critique this deck:

\`\`\`json
${JSON.stringify(deck, null, 2)}
\`\`\`

Theme Tokens:
\`\`\`json
${JSON.stringify(themeTokens, null, 2)}
\`\`\`

Brand Rules:
\`\`\`json
${JSON.stringify(brandRules, null, 2)}
\`\`\`

Return the critique JSON.`
      }
    ]
  };
}

// ===== 6. REFINEMENT PASS =====

export function getRefinementPrompt(
  deck: BraintrustDeck,
  critique: BraintrustCritique
) {
  return {
    model: "gpt-4o",
    temperature: 0.2,
    response_format: { type: "json_object" as const },
    messages: [
      {
        role: "system" as const,
        content: `You are a surgical editor applying targeted fixes based on critique feedback.

**Your Task:**
Apply ONLY the fixes dictated by the critique. Do not change anything else.

**Rules:**
1. Only edit slides/layouts/assets mentioned in critique.targets
2. Apply the exact fixes described in critique.fix
3. Add slides if critique.addOrRemove.addSlides is provided
4. Remove slides if critique.addOrRemove.removeSlideIds is provided
5. Preserve intent and messaging - only fix the identified issues
6. Do NOT introduce new problems

**Surgical Precision:**
- If fix says "Increase title to 96pt", change only that
- If fix says "Use brand.primary.600", use exact color token
- If fix says "Consolidate into one element", merge as specified
- If fix says "Add proof slide", add it in the right position

**CRITICAL:** You must respond with ONLY valid JSON. No explanations, no markdown, no comments - just the JSON object representing the refined BraintrustDeck.`
      },
      {
        role: "user" as const,
        content: `Apply these fixes to the deck:

**Current Deck:**
\`\`\`json
${JSON.stringify(deck, null, 2)}
\`\`\`

**Critique:**
\`\`\`json
${JSON.stringify(critique, null, 2)}
\`\`\`

Apply ONLY the fixes described in the critique.
Return ONLY the complete refined deck as a JSON object. No markdown, no explanations, just valid JSON.`
      }
    ]
  };
}
