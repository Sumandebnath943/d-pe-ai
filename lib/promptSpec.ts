/**
 * Shared prompt-generation spec — the single source of truth for HOW every
 * generated prompt is structured and WHAT quality bar it must clear.
 *
 * Every generation path imports `GENERATION_SPEC` so they all hold one
 * consistent standard:
 *   - the interview's Phase-2 generation        (app/api/chat)
 *   - reverse-engineering from an example        (app/api/chat)
 *   - the best-of-N tournament's candidates      (app/api/advanced)
 *
 * The QA / self-critique pass (app/api/critique) audits prompts against the
 * QUALITY_STANDARDS exported here, so the bar that writes prompts is the same
 * bar that grades them.
 *
 * Policy: EVERY generated prompt contains ALL NINE sections, fully written.
 * Complexity scales the DEPTH of each section, never the section count.
 */

/** The nine canonical sections — all present in every generated prompt. */
export const PROMPT_SECTIONS = [
  'Persona',
  'Objective',
  'Context',
  'Audience',
  'Instructions',
  'Instructional Cues',
  'Format & Structure',
  'Tone & Style',
  'Examples',
] as const

/**
 * Structure mandate. All nine sections, always — depth scales with the task,
 * the section count never does.
 */
export const PROMPT_STRUCTURE = `PROMPT STRUCTURE — ALL NINE SECTIONS, ALWAYS (NON-NEGOTIABLE)

Every prompt you generate MUST contain ALL NINE sections below, each introduced by its EXACT "## <emoji> NAME" heading, in this exact order:

## 👤 PERSONA
## 🎯 OBJECTIVE
## 🧠 CONTEXT
## 🎯 AUDIENCE
## 📋 INSTRUCTIONS
## 🧩 INSTRUCTIONAL CUES
## 📝 FORMAT & STRUCTURE
## 🎨 TONE & STYLE
## 💡 EXAMPLES

Hard rules:
- NEVER omit a section. NEVER merge sections. NEVER collapse the prompt into a single paragraph or a short summary.
- If the user did not give you details for a section, INFER specific, realistic, on-topic content from everything else you know — never leave a section thin, generic, or empty.
- The finished prompt must be LONG, detailed, and dense with context — typically 700–1500+ words. When in doubt, write MORE, not less.
- Depth scales with the task; the section COUNT never does. A simple task still gets all nine sections, each at least a full, specific paragraph. A complex task gets all nine written exhaustively.`

/**
 * Per-section authoring guidance. Headings use the exact "## <emoji> NAME"
 * format the UI parses. Every section is mandatory and must be substantial.
 */
export const SECTION_GUIDANCE = `SECTION-BY-SECTION GUIDANCE

Write every section using its exact heading and the intent below, in order. Each section must be substantial, specific, and concrete — never a single thin line.

## 👤 PERSONA
A rich, vivid identity for the AI — a fully developed expert character with a named role, a specific background, deep domain expertise, a way of thinking, and a professional ethos. At least 3-5 sentences, in second person ("You are..."). Never "You are a helpful assistant".

## 🎯 OBJECTIVE
The precise mission, spelled out. What this AI exists to do, what a perfect output looks like, and what would make it fail. Specific enough that only one interpretation is possible.

## 🧠 CONTEXT
Everything the AI needs to know about the world it operates in: the product or platform, the domain, the situation, the stakes, the constraints, and relevant background knowledge. Dense and concrete — several sentences — even when you must infer it.

## 🎯 AUDIENCE
A precise portrait of the end recipient: who they are, their expertise and vocabulary level, what they care about, what frustrates them, what earns their trust. Detailed enough that the AI can immediately calibrate tone and depth.

## 📋 INSTRUCTIONS
The operational rulebook as a NUMBERED list of explicit, unambiguous directives — at least 8-12 of them. Cover what to always do, what to never do, edge cases, out-of-scope requests, and how to handle ambiguity. Each item specific enough that violating it would be immediately obvious.

## 🧩 INSTRUCTIONAL CUES
Advanced behavioral and reasoning directives: how the AI should think before responding (step-by-step? weigh multiple approaches? self-critique its draft? ask clarifying questions first?). Write concrete cognitive patterns, not vague advice.

## 📝 FORMAT & STRUCTURE
Exact output specifications: length ranges, headers, markdown usage, list vs paragraph, opening and closing conventions, what to include and what to omit. If the output follows a template, write the full template here explicitly.

## 🎨 TONE & STYLE
The precise voice — far beyond "professional" or "friendly". What it sounds like at its best, the words it uses and avoids, how it handles uncertainty and pushback. Include 2-3 example micro-phrases that capture the voice.

## 💡 EXAMPLES
At least one fully worked example: an ideal input and the ideal output it should produce. If the user supplied examples, include and annotate them; otherwise craft realistic, on-topic illustrative examples and clearly label them as illustrative.`

/** Non-negotiable quality bar. The QA critique pass audits against this. */
export const QUALITY_STANDARDS = `QUALITY STANDARDS — NON-NEGOTIABLE:

- Output ALL NINE sections, every time, each with its exact "## " heading. A missing, merged, or thin section is a failure.
- Favor length, depth, and completeness. A long, dense, context-rich prompt that leaves nothing ambiguous is the goal; a short, generic, or unstructured prompt is a failure. Fill every section with substantive, specific content — infer it when the user did not provide it.
- Write the prompt as a direct address to the AI in second person throughout. No meta-commentary, no "this prompt will...". Just instructions.
- Be specific. If an instruction contains the words "appropriate", "relevant", "good", or "helpful" without further definition, rewrite it with concrete specifics.
- Anticipate the top 3 ways this prompt could go wrong and write explicit instructions that prevent each failure mode.
- The finished prompt must be immediately usable: someone who never spoke to you can paste it into any LLM and get the intended output without modification.
- Never use placeholder text like "[insert X here]". Fill everything in.
- The Persona must read like a real, named specialist with genuine character and expertise.`

/**
 * The complete generation spec: structure mandate + section guidance + quality
 * bar. Compose this into any system prompt that writes a final prompt.
 */
export const GENERATION_SPEC = `${PROMPT_STRUCTURE}

---

${SECTION_GUIDANCE}

---

${QUALITY_STANDARDS}`
