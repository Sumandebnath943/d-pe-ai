import { NextRequest, NextResponse } from "next/server";
import { llmComplete, hasLLMProvider } from "@/lib/llm";
import { GENERATION_SPEC } from "@/lib/promptSpec";

export const dynamic = "force-dynamic";

// The distinct strategies the candidate prompts are generated against. Keeping
// them explicit makes the tournament's variety meaningful rather than random.
const STRATEGIES = [
  { id: "structured", label: "Direct & Structured", strategy: "A clean, comprehensive, by-the-book prompt covering all nine pillars with no frills." },
  { id: "cot", label: "Chain-of-Thought", strategy: "Forces explicit step-by-step reasoning and a visible thinking process before the answer." },
  { id: "persona", label: "Immersive Persona", strategy: "A rich, deeply-characterized expert persona that shapes voice and judgment throughout." },
  { id: "guardrails", label: "Constraint-Driven", strategy: "Emphasizes strict rules, edge-case handling, and exact output-format precision." },
];

interface Message { role?: string; content?: string }

/**
 * Retry on LLM provider rate limits (429). The tournament fires many calls and
 * can exceed the tokens-per-minute budget on the free tier; the provider tells
 * us how long to wait, so we back off and retry rather than failing the whole
 * tournament.
 */
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
          throw new Error("LLM rate limit reached — the tournament needs more tokens per minute than the current tier allows. Try again shortly, or use Normal mode.");
        }
        throw e;
      }
      // Honor "try again in Xms / Xs" when present, else exponential-ish backoff.
      const m = (err.message ?? "").match(/try again in ([\d.]+)\s*(ms|s)/i);
      let waitMs = 1500 * (i + 1);
      if (m) waitMs = parseFloat(m[1]) * (m[2].toLowerCase() === "s" ? 1000 : 1) + 400;
      await new Promise((r) => setTimeout(r, Math.min(waitMs, 10000)));
    }
  }
  throw lastErr;
}

/** Call the LLM for a JSON object response and parse it robustly. */
async function jsonCompletion(
  system: string,
  user: string,
  maxTokens = 4096
): Promise<unknown> {
  const text =
    (await withRetry(() =>
      llmComplete({
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0.7,
        maxTokens,
        jsonObject: true,
      })
    )) || "{}";
  try {
    return JSON.parse(text);
  } catch {
    // Strip markdown fences or surrounding prose if the model added any.
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error("Model did not return valid JSON.");
  }
}

/** A plain-text completion (for running candidate prompts against test inputs). */
async function textCompletion(system: string, user: string, maxTokens = 1024): Promise<string> {
  const text = await withRetry(() =>
    llmComplete({
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.6,
      maxTokens,
    })
  );
  return text.trim();
}

function conversationToContext(messages: Message[]): string {
  return messages
    .filter((m) => m.content && m.content.trim().length > 0)
    .map((m) => `${m.role === "assistant" ? "INTERVIEWER" : "USER"}: ${m.content!.trim()}`)
    .join("\n\n");
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

    // 1) CANDIDATES — produce N distinct full system prompts, one per strategy.
    if (task === "candidates") {
      const context = conversationToContext(body.messages ?? []);
      const seed: string | undefined = body.seedPrompt;
      const system = `You are an elite prompt engineer. Given an interview transcript describing what a user needs a prompt for, you write COMPLETE, production-ready system prompts.

You will produce exactly ${STRATEGIES.length} candidate prompts, each following a DIFFERENT strategy. Each must be a full, self-contained system prompt — not a description of one. Every candidate must follow the shared generation spec below (adaptive structure + quality bar); the strategies differ only in APPROACH, never in completeness or quality.

Return ONLY valid JSON of the shape:
{"candidates":[{"id":"<strategy id>","prompt":"<the full system prompt as a single string>"}]}

The strategy ids and their required approaches:
${STRATEGIES.map((s) => `- "${s.id}" (${s.label}): ${s.strategy}`).join("\n")}

Every candidate must fully satisfy the user's actual intent; they differ only in approach, not in what they accomplish.

---

${GENERATION_SPEC}`;

      const user = `INTERVIEW TRANSCRIPT:\n${context}\n\n${seed ? `A baseline prompt was already drafted (use it only as reference, you may improve on it):\n${seed}\n\n` : ""}Generate the ${STRATEGIES.length} candidate prompts now as JSON.`;

      const parsed = (await jsonCompletion(system, user, 6000)) as { candidates?: { id?: string; prompt?: string }[] };
      const raw = parsed.candidates ?? [];
      const candidates = STRATEGIES.map((s) => {
        const found = raw.find((c) => c.id === s.id) ?? raw[STRATEGIES.indexOf(s)];
        return {
          id: s.id,
          label: s.label,
          strategy: s.strategy,
          prompt: (found?.prompt ?? "").trim(),
        };
      }).filter((c) => c.prompt.length > 0);

      return NextResponse.json({ candidates });
    }

    // 2) TESTCASES — synthesize realistic end-user inputs (no user effort needed).
    if (task === "testcases") {
      const context = conversationToContext(body.messages ?? []);
      const count = Math.min(Math.max(body.count ?? 3, 1), 5);
      const system = `You generate realistic test inputs for evaluating a prompt. Given an interview describing what a prompt is for, produce ${count} diverse, realistic inputs that an END USER would actually send to the finished AI. Cover typical and edge cases. Keep each input concise and self-contained.

Return ONLY valid JSON: {"testcases":["<input 1>","<input 2>", ...]}`;
      const user = `INTERVIEW TRANSCRIPT:\n${context}\n\nGenerate ${count} test inputs as JSON.`;
      const parsed = (await jsonCompletion(system, user, 2048)) as { testcases?: string[] };
      const testcases = (parsed.testcases ?? []).filter((t) => typeof t === "string" && t.trim().length > 0).slice(0, count);
      return NextResponse.json({ testcases });
    }

    // 3) RUN — execute ONE candidate prompt against ALL test inputs.
    if (task === "run") {
      const prompt: string = body.prompt ?? "";
      const testcases: string[] = body.testcases ?? [];
      const outputs = await Promise.all(
        testcases.map((tc) => textCompletion(prompt, tc, 800))
      );
      return NextResponse.json({ outputs });
    }

    // 4) JUDGE — score each candidate's outputs against the user's intent.
    if (task === "judge") {
      const context = conversationToContext(body.messages ?? []);
      const testcases: string[] = body.testcases ?? [];
      const entries: { id: string; label: string; outputs: string[] }[] = body.entries ?? [];

      const system = `You are a rigorous, impartial evaluator of AI prompt quality. You are given a user's intent (from an interview), a set of test inputs, and — for several candidate prompts — the outputs each produced on those inputs.

Score each candidate from 0 to 100 on how well its OUTPUTS fulfill the user's true intent: correctness, completeness, usefulness, tone-fit, and consistency across the test inputs. Be discriminating — do not give everything the same score.

Return ONLY valid JSON:
{"scores":[{"id":"<candidate id>","score":<0-100>,"reasoning":"<one or two sentences>"}],"winnerId":"<id of the highest-quality candidate>"}`;

      const user = `USER INTENT (interview):\n${context}\n\nTEST INPUTS:\n${testcases.map((t, i) => `[${i + 1}] ${t}`).join("\n")}\n\nCANDIDATE OUTPUTS:\n${entries
        .map(
          (e) =>
            `### Candidate "${e.id}" (${e.label})\n${e.outputs
              .map((o, i) => `Output for input [${i + 1}]:\n${o}`)
              .join("\n\n")}`
        )
        .join("\n\n---\n\n")}\n\nEvaluate and return JSON.`;

      const parsed = (await jsonCompletion(system, user, 2048)) as {
        scores?: { id?: string; score?: number; reasoning?: string }[];
        winnerId?: string;
      };
      const scores = (parsed.scores ?? []).map((s) => ({
        candidateId: String(s.id ?? ""),
        score: Math.max(0, Math.min(100, Number(s.score ?? 0))),
        reasoning: String(s.reasoning ?? ""),
      }));
      // Trust the model's winner if valid, else fall back to the top score.
      let winnerId = parsed.winnerId && scores.some((s) => s.candidateId === parsed.winnerId)
        ? parsed.winnerId
        : scores.slice().sort((a, b) => b.score - a.score)[0]?.candidateId;
      return NextResponse.json({ scores, winnerId });
    }

    return NextResponse.json({ error: `Unknown task: ${task}` }, { status: 400 });
  } catch (error) {
    console.error("Advanced tournament error:", error);
    const message = error instanceof Error ? error.message : "Tournament request failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
