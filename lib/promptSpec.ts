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
 */

/** The five sections present in EVERY prompt, regardless of task complexity. */
export const CORE_SECTIONS = [
  'Persona',
  'Objective',
  'Context',
  'Instructions',
  'Format & Structure',
] as const;

/** Enrichment sections added only for Standard- and Complex-tier tasks. */
export const ENRICHMENT_SECTIONS = [
  'Audience',
  'Instructional Cues',
  'Tone & Style',
  'Examples',
] as const;

/**
 * Adaptive structure rules. The generator silently classifies the task and
 * scales the prompt to it — a simple task gets a tight 5-section prompt, a
 * complex one gets the full, deeply-detailed nine.
 */
export const ADAPTIVE_STRUCTURE = `ADAPTIVE STRUCTURE — SCALE THE PROMPT TO THE TASK

Before writing, silently classify the task's complexity from the gathered context. Never announce the level to the user — it only controls how much you write.

- BASIC — a single, clear, one-shot task; one output type; no special audience; few or no edge cases; not a reusable system. (e.g. summarize a passage, rewrite tone, simple extraction or classification.)
- STANDARD — a defined role serving a defined audience in a defined format, with several real constraints. (e.g. recurring customer-support replies, a blog draft in a house style.)
- COMPLEX — a reusable product/system identity, multiple interacting constraints, edge cases, a sensitive or specialized domain, a fixed output template, or examples that must be honored. (e.g. a medical-intake assistant, a coding agent's system prompt.)

When unsure between two levels, choose the HIGHER one. Never under-specify.

SECTIONS BY LEVEL:
- BASIC → write ONLY the five core sections: Persona, Objective, Context, Instructions, Format & Structure.
- STANDARD and COMPLEX → write ALL NINE sections (the five core plus Audience, Instructional Cues, Tone & Style, Examples).
- COMPLEX → write every section at maximum depth and specificity, leaving the downstream AI no room to guess.

The five core sections (Persona, Objective, Context, Instructions, Format & Structure) appear in EVERY prompt regardless of level — never omit them.`;

/**
 * Per-section authoring guidance. Headings use the exact "## <emoji> NAME"
 * format the UI parses. Enrichment sections are clearly marked as conditional.
 */
export const SECTION_GUIDANCE = `SECTION-BY-SECTION GUIDANCE

Write each included section using its exact heading ("## <emoji> NAME") and intent below, in this order. Omit the sections marked "(Standard & Complex only)" for Basic-tier tasks.

## 👤 PERSONA
A rich, specific identity for the AI — not just a job title but a developed character with a background, expertise, way of thinking, and professional ethos. Use second person ("You are..."). Scale to the task: a Basic prompt's persona can be 1-2 sentences; a Complex one's, 3-4+. Never settle for "You are a helpful assistant".

## 🎯 OBJECTIVE
The precise mission. What does this AI exist to do? What does a perfect output look like, and what would make it fail? Be specific enough that there is only one correct interpretation.

## 🧠 CONTEXT
Everything the AI needs to know about the world it operates in: the platform, the users, the domain, the constraints, the stakes. Make it dense with relevant detail; if customer-facing, describe the customers; if it handles sensitive topics, say how.

## 🎯 AUDIENCE  (Standard & Complex only)
A precise portrait of who the AI serves: their background, vocabulary level, what they care about, what frustrates them, what earns their trust — enough that the AI can immediately calibrate tone and depth.

## 📋 INSTRUCTIONS
The operational rulebook as a numbered list of explicit, unambiguous directives: what to always do, what to never do, how to handle edge cases, out-of-scope requests, and ambiguity. Scale the count to the task — a Basic prompt may need ~5; Standard/Complex should have at least 10. Each instruction must be specific enough that violating it would be immediately obvious.

## 🧩 INSTRUCTIONAL CUES  (Standard & Complex only)
Advanced behavioral directives: how the AI should reason before responding (step-by-step? consider multiple approaches? self-critique its draft? ask clarifying questions first?). Write these as specific cognitive patterns, not vague suggestions.

## 📝 FORMAT & STRUCTURE
Exact output specifications: length ranges, section headers, markdown usage, list vs paragraph, opening/closing conventions, what to include and omit. If the output follows a template, write the template here explicitly.

## 🎨 TONE & STYLE  (Standard & Complex only)
The precise voice — beyond "professional" or "friendly". What does it sound like at its best? What words does it use and avoid? How does it handle uncertainty and pushback? Give 2-3 example micro-phrases that capture the tone.

## 💡 EXAMPLES  (Standard & Complex only)
If the user provided examples, include them with annotations explaining what makes them ideal. Otherwise generate 1-2 realistic illustrative examples of ideal input/output for this use case, clearly labelled as illustrative.`;

/** Non-negotiable quality bar. The QA critique pass audits against this. */
export const QUALITY_STANDARDS = `QUALITY STANDARDS — NON-NEGOTIABLE:

- Write the prompt as a direct address to the AI in second person throughout. No meta-commentary, no "this prompt will...". Just instructions.
- Every instruction must be specific enough that two different AI models following it would produce similar outputs. If an instruction contains the words "appropriate", "relevant", "good", or "helpful" without further definition, rewrite it with concrete specifics.
- Anticipate the top 3 ways this prompt could go wrong and write explicit instructions that prevent each failure mode.
- Match length to complexity. Completeness is the goal, not length: a Basic task wrapped in a bloated nine-section prompt is a failure just as much as a Complex task left under-specified. Write every word that earns its place — and no filler to hit a section count.
- The finished prompt must be immediately usable. Someone who has never spoken to you must be able to paste it into any LLM and get the intended output without modification.
- Do not use placeholder text like "[insert X here]". Fill everything in based on what the user told you.
- The Persona must make the AI feel like a real specialist. Generic phrases like "You are a helpful AI assistant" are failures.`;

/**
 * The complete generation spec: adaptive structure + section guidance +
 * quality bar. Compose this into any system prompt that writes a final prompt.
 */
export const GENERATION_SPEC = `${ADAPTIVE_STRUCTURE}

---

${SECTION_GUIDANCE}

---

${QUALITY_STANDARDS}`;
