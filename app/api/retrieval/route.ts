import { NextRequest, NextResponse } from "next/server";
import { llmComplete, hasLLMProvider } from "@/lib/llm";

export const dynamic = "force-dynamic";

/** Retry on Groq rate limits (429), honoring the "try again in Xs" hint when present. */
async function withRetry<T>(fn: () => Promise<T>, tries = 3): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e: unknown) {
      lastErr = e;
      const err = e as { status?: number; message?: string };
      const isRateLimit = err.status === 429 || /rate_limit|429/i.test(err.message ?? "");
      if (!isRateLimit || i === tries - 1) throw e;
      const m = (err.message ?? "").match(/try again in ([\d.]+)\s*(ms|s)/i);
      let waitMs = 1200 * (i + 1);
      if (m) waitMs = parseFloat(m[1]) * (m[2].toLowerCase() === "s" ? 1000 : 1) + 300;
      await new Promise((r) => setTimeout(r, Math.min(waitMs, 8000)));
    }
  }
  throw lastErr;
}

async function jsonCompletion(system: string, user: string, maxTokens = 1024): Promise<unknown> {
  const text =
    (await withRetry(() =>
      llmComplete({
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0.4,
        maxTokens,
        jsonObject: true,
      })
    )) || "{}";
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error("Model did not return valid JSON.");
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const task = body.task as string;
    if (!hasLLMProvider()) {
      return NextResponse.json(
        { error: "No LLM provider configured. Add OPENAI_API_KEY or GROQ_API_KEY to .env.local." },
        { status: 500 }
      );
    }

    // 1) EXPAND — reformulate the query (multi-query) and draft a hypothetical
    //    answer (HyDE) so retrieval can match on phrasing the user didn't use.
    if (task === "expand") {
      const query: string = (body.query ?? "").toString().slice(0, 1000);
      const count = Math.min(Math.max(body.count ?? 3, 1), 5);
      const system = `You improve retrieval for a document search system. Given a user's query, you produce:
1. "variants": ${count} alternative phrasings of the query that a relevant passage might match (synonyms, related terms, more specific and more general forms). Keep each concise.
2. "hyde": a short, plausible hypothetical passage (2-4 sentences) that would directly answer the query, as if copied from an ideal source document. This is used only to find similar real passages — it does not need to be factually correct.

Return ONLY valid JSON: {"variants": ["...", "..."], "hyde": "..."}`;
      const user = `USER QUERY:\n${query}\n\nReturn the JSON.`;
      const parsed = (await jsonCompletion(system, user, 700)) as {
        variants?: string[];
        hyde?: string;
      };
      const variants = (parsed.variants ?? [])
        .filter((v) => typeof v === "string" && v.trim().length > 0)
        .slice(0, count);
      const hyde = typeof parsed.hyde === "string" ? parsed.hyde.trim() : "";
      return NextResponse.json({ variants, hyde });
    }

    // 2) RERANK — score each candidate passage for relevance to the query and
    //    return them ordered best-first. Replaces pure fusion order with a
    //    relevance judgment over the actual passage text.
    if (task === "rerank") {
      const query: string = (body.query ?? "").toString().slice(0, 1000);
      const candidates: { id: string; text: string }[] = (body.candidates ?? []).slice(0, 12);
      if (candidates.length === 0) return NextResponse.json({ ranking: [] });

      const system = `You are a passage re-ranker. Given a query and several candidate passages, score each passage 0-100 for how directly it helps answer the query (relevance, specificity, completeness). Be discriminating.

Return ONLY valid JSON: {"ranking":[{"id":"<id>","score":<0-100>}]} including every candidate id, ordered best-first.`;
      const user = `QUERY:\n${query}\n\nCANDIDATE PASSAGES:\n${candidates
        .map((c) => `### id: ${c.id}\n${(c.text ?? "").slice(0, 500)}`)
        .join("\n\n")}\n\nReturn the JSON ranking.`;

      const parsed = (await jsonCompletion(system, user, 900)) as {
        ranking?: { id?: string; score?: number }[];
      };
      const ranking = (parsed.ranking ?? [])
        .map((r) => ({ id: String(r.id ?? ""), score: Math.max(0, Math.min(100, Number(r.score ?? 0))) }))
        .filter((r) => candidates.some((c) => c.id === r.id))
        .sort((a, b) => b.score - a.score);
      return NextResponse.json({ ranking });
    }

    return NextResponse.json({ error: `Unknown task: ${task}` }, { status: 400 });
  } catch (error) {
    console.error("Retrieval route error:", error);
    const message = error instanceof Error ? error.message : "Retrieval request failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
