import { NextRequest, NextResponse } from "next/server";
import { llmComplete, hasLLMProvider } from "@/lib/llm";
import { CONSTITUTION, formatConstitution } from "@/lib/constitution";
import type { RuleStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

async function withRetry<T>(fn: () => Promise<T>, tries = 4): Promise<T> {
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
          throw new Error("LLM rate limit reached during the safety review. Try again shortly.");
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

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();
    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "A prompt string is required." }, { status: 400 });
    }

    if (!hasLLMProvider()) {
      return NextResponse.json(
        { error: "No LLM provider configured. Add OPENAI_API_KEY or GROQ_API_KEY to .env.local." },
        { status: 500 }
      );
    }

    const system = `You are a Responsible-AI reviewer. You audit a SYSTEM PROMPT (the instructions that will be given to another AI) against a written constitution, then, if anything breaches it, you rewrite the prompt into a safe version that preserves the user's legitimate intent.

THE CONSTITUTION:
${formatConstitution()}

For EVERY rule, judge the prompt:
- "pass": the prompt is fully compliant (this is the common case for ordinary, benign prompts).
- "warn": technically compliant but missing a safeguard you'd recommend adding.
- "fail": the prompt breaches this rule.

Be calibrated: do NOT invent problems. A normal prompt (e.g. marketing copy, coding help, summarization) should be mostly "pass". Reserve "fail" for genuine breaches.

If there is at least one "fail", produce "revisedPrompt": a rewritten version of the prompt that removes the breach while keeping the user's legitimate goal and the prompt's overall structure. If there are no fails, set "revisedPrompt" to null.

Return ONLY valid JSON of exactly this shape:
{
  "score": <integer 0-100, overall responsibility quality>,
  "summary": "<one or two sentences on the prompt's responsibility posture>",
  "findings": [ { "ruleId": "<id>", "status": "pass|warn|fail", "note": "<short justification>" } ],
  "revisedPrompt": <string or null>
}
Include a finding for every rule id in the constitution.`;

    const user = `SYSTEM PROMPT TO REVIEW:\n"""\n${prompt}\n"""\n\nReview it against the constitution and return the JSON.`;

    const raw =
      (await withRetry(() =>
        llmComplete({
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          temperature: 0.3,
          maxTokens: 6000,
          jsonObject: true,
        })
      )) || "{}";
    let parsed: {
      score?: number;
      summary?: string;
      findings?: { ruleId?: string; status?: string; note?: string }[];
      revisedPrompt?: string | null;
    };
    try {
      parsed = JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : {};
    }

    const titleById = new Map(CONSTITUTION.map((r) => [r.id, r.title]));
    const validStatus = (s: unknown): RuleStatus =>
      s === "fail" || s === "warn" ? s : "pass";

    // Normalize findings to one per constitution rule (defaulting to pass).
    const byId = new Map((parsed.findings ?? []).map((f) => [String(f.ruleId), f]));
    const findings = CONSTITUTION.map((rule) => {
      const f = byId.get(rule.id);
      return {
        ruleId: rule.id,
        ruleTitle: rule.title,
        status: validStatus(f?.status),
        note: String(f?.note ?? "Compliant."),
      };
    });

    const hasFail = findings.some((f) => f.status === "fail");
    const hasWarn = findings.some((f) => f.status === "warn");
    const revisedPrompt =
      typeof parsed.revisedPrompt === "string" && parsed.revisedPrompt.trim().length > 0
        ? parsed.revisedPrompt.trim()
        : undefined;

    const verdict: "safe" | "revised" | "flagged" = hasFail
      ? revisedPrompt
        ? "revised"
        : "flagged"
      : "safe";

    const score = Math.max(0, Math.min(100, Math.round(Number(parsed.score ?? (hasFail ? 50 : hasWarn ? 80 : 95)))));

    return NextResponse.json({
      status: "done",
      verdict,
      score,
      summary: String(parsed.summary ?? ""),
      findings,
      revised: verdict === "revised",
      revisedPrompt: verdict === "revised" ? revisedPrompt : undefined,
    });
  } catch (error) {
    console.error("Responsible review error:", error);
    const message = error instanceof Error ? error.message : "Safety review failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
