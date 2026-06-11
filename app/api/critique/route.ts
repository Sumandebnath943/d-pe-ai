import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { QUALITY_STANDARDS } from "@/lib/promptSpec";

export const dynamic = "force-dynamic";

const MODEL = "llama-3.3-70b-versatile";

/** Retry on Groq rate limits (429), honoring the "try again in Xs" hint. */
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
          throw new Error("Groq rate limit reached during the quality review. Try again shortly.");
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

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey || apiKey === "your_groq_api_key_here") {
      return NextResponse.json(
        { error: "Groq API key is not configured. Add GROQ_API_KEY to .env.local." },
        { status: 500 }
      );
    }
    const groq = new Groq({ apiKey });

    const system = `You are a senior prompt-engineering reviewer. You audit a generated SYSTEM PROMPT against a strict quality bar, then rewrite it to clear that bar while preserving its intent and structure.

THE QUALITY BAR:
${QUALITY_STANDARDS}

ADAPTIVE STRUCTURE NOTE: prompts are written to a complexity tier. BASIC prompts have five sections (Persona, Objective, Context, Instructions, Format & Structure); STANDARD and COMPLEX prompts have all nine (adding Audience, Instructional Cues, Tone & Style, Examples). Judge the prompt against the tier it appears to target — do NOT penalize a simple, well-scoped Basic prompt for omitting enrichment sections, and do NOT reward a complex prompt that is missing them.

Do the following:
1. Classify the task this prompt targets as "basic", "standard", or "complex".
2. Score the prompt 0-100 on how well it clears the quality bar (specificity, completeness for its tier, freedom from vague words, edge-case coverage, immediate usability, no bloat).
3. List concrete issues (each with an "area", a "severity" of "minor" or "major", and a short "note"). If the prompt is excellent, return an empty list.
4. If you can meaningfully strengthen the prompt, return "improvedPrompt": the FULL rewritten prompt, preserving the "## SECTION" heading format and the appropriate sections for its tier. If it is already excellent (no issues, score >= 90), return "improvedPrompt": null.

Return ONLY valid JSON of exactly this shape:
{
  "level": "basic|standard|complex",
  "score": <integer 0-100>,
  "summary": "<one or two sentences on the prompt's quality>",
  "issues": [ { "area": "<short>", "severity": "minor|major", "note": "<short>" } ],
  "improvedPrompt": <string or null>
}`;

    const user = `SYSTEM PROMPT TO REVIEW:\n"""\n${prompt}\n"""\n\nReview it against the quality bar and return the JSON.`;

    const res = await withRetry(() =>
      groq.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0.3,
        // 4096 is ample for a full rewritten prompt (~3k words) and stays well
        // under Groq's per-minute token ceiling, unlike an 8k reservation.
        max_tokens: 4096,
        response_format: { type: "json_object" },
      })
    );

    const raw = res.choices[0]?.message?.content ?? "{}";
    let parsed: {
      level?: string;
      score?: number;
      summary?: string;
      issues?: { area?: string; severity?: string; note?: string }[];
      improvedPrompt?: string | null;
    };
    try {
      parsed = JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : {};
    }

    const level = parsed.level === "basic" || parsed.level === "complex" ? parsed.level : "standard";
    const issues = (parsed.issues ?? [])
      .filter((i) => i && typeof i.note === "string" && i.note.trim().length > 0)
      .map((i) => ({
        area: String(i.area ?? "General"),
        severity: i.severity === "major" ? "major" : "minor",
        note: String(i.note),
      }));
    const improvedPrompt =
      typeof parsed.improvedPrompt === "string" && parsed.improvedPrompt.trim().length > 0
        ? parsed.improvedPrompt.trim()
        : undefined;
    const score = Math.max(0, Math.min(100, Math.round(Number(parsed.score ?? (issues.length ? 70 : 92)))));

    return NextResponse.json({
      status: "done",
      score,
      level,
      summary: String(parsed.summary ?? ""),
      issues,
      improved: !!improvedPrompt,
      improvedPrompt,
    });
  } catch (error) {
    console.error("Quality critique error:", error);
    const message = error instanceof Error ? error.message : "Quality review failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
