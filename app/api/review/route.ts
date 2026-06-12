import { NextRequest, NextResponse } from "next/server";
import { llmComplete, hasLLMProvider } from "@/lib/llm";
import { CONSTITUTION } from "@/lib/constitution";
import { parseReviewResponse, REWRITE_THRESHOLD } from "@/lib/review";

export const dynamic = "force-dynamic";

/** Retry on LLM provider rate limits (429), honoring the "try again in Xs" hint. */
async function withRetry<T>(fn: () => Promise<T>, tries = 3): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e: unknown) {
      lastErr = e;
      const err = e as { status?: number; message?: string };
      const isRateLimit = err.status === 429 || /rate_limit|429/i.test(err.message ?? "");
      if (!isRateLimit || i === tries - 1) {
        if (isRateLimit) {
          throw new Error("LLM rate limit reached during the review. Try again shortly.");
        }
        throw e;
      }
      const m = (err.message ?? "").match(/try again in ([\d.]+)\s*(ms|s)/i);
      let waitMs = 1500 * (i + 1);
      if (m) waitMs = parseFloat(m[1]) * (m[2].toLowerCase() === "s" ? 1000 : 1) + 400;
      await new Promise((r) => setTimeout(r, Math.min(waitMs, 10000)));
    }
  }
  throw lastErr;
}

// The full constitution embedded as a numbered list so the model has the actual
// rule text (not just a reference). Names match `title`, so a violation listed
// by name is unambiguous.
const RULES_BLOCK = CONSTITUTION.map(
  (r, i) => `${i + 1}. ${r.title}: ${r.description}`
).join("\n");

export async function POST(req: NextRequest) {
  try {
    const { prompt, context } = await req.json();
    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "A prompt string is required." }, { status: 400 });
    }

    if (!hasLLMProvider()) {
      return NextResponse.json(
        { error: "No LLM provider configured. Add OPENAI_API_KEY or GROQ_API_KEY to .env.local." },
        { status: 500 }
      );
    }

    const system = `You are a dual-purpose reviewer of SYSTEM PROMPTS (the instructions given to another AI). In ONE pass you evaluate the prompt on two axes — engineering QUALITY and CONSTITUTIONAL responsibility — and, only when needed, rewrite it.

PART A — QUALITY (0–100)
Score the prompt on: clarity, specificity, persona completeness, instruction depth, format instructions, and tone definition. A vague, one-sentence, or structurally thin prompt scores low; a detailed, specific, well-structured prompt scores high. In "qualityIssues", list every concrete problem you find — be specific, never vague ("the persona is one generic line with no expertise" not "could be better"). If the prompt is excellent, return an empty array.

PART B — CONSTITUTION (10 rules)
Judge the prompt against ALL TEN rules below. A rule is VIOLATED only if the prompt genuinely breaches it — ordinary, benign prompts (marketing copy, coding help, summarization, etc.) pass every rule. In "constitutionViolations", list ONLY the violated rules, each by its exact NAME from the list. If none are violated, return an empty array.

${RULES_BLOCK}

PART C — REWRITE
If qualityScore >= ${REWRITE_THRESHOLD} AND constitutionViolations is empty: set "rewrite" to null and "rewriteSkipped" to true.
Otherwise: set "rewriteSkipped" to false and set "rewrite" to a FULLY rewritten version of the prompt that fixes every quality issue and satisfies all ten constitution rules, while preserving the user's legitimate intent and the prompt's overall structure. Write the complete rewritten prompt, not a description of it.

PART D — VERDICT
Write a 1–2 sentence plain-English summary of the review in "verdict".

Respond with ONLY a raw JSON object of EXACTLY this shape — no preamble, no markdown, no code fences:
{
  "qualityScore": number,
  "qualityIssues": string[],
  "constitutionViolations": string[],
  "rewrite": string | null,
  "rewriteSkipped": boolean,
  "verdict": string
}`;

    const user = `SYSTEM PROMPT TO REVIEW:\n"""\n${prompt}\n"""${
      context && typeof context === "string" && context.trim().length > 0
        ? `\n\nADDITIONAL CONTEXT (the user's intent, for judging quality only):\n${context.trim()}`
        : ""
    }\n\nReview it on both axes and return the JSON.`;

    const raw =
      (await withRetry(() =>
        llmComplete({
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          temperature: 0.3,
          maxTokens: 4096,
          jsonObject: true,
        })
      )) || "{}";

    const result = parseReviewResponse(raw);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Unified review error:", error);
    const message = error instanceof Error ? error.message : "Review failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
