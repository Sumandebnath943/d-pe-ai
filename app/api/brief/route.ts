import { NextRequest, NextResponse } from "next/server";
import { hasLLMProvider } from "@/lib/llm";
import { extractBrief } from "@/lib/briefExtract";

export const dynamic = "force-dynamic";

/**
 * Brief-extraction endpoint. Takes the interview transcript and returns a
 * compact structured PromptBrief that the generation step consumes instead of
 * the full conversation. Returns 500 on failure so the client falls back to the
 * full-transcript generation path.
 */
export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Invalid request payload: messages array is required." },
        { status: 400 }
      );
    }

    if (!hasLLMProvider()) {
      return NextResponse.json(
        { error: "No LLM provider configured. Add OPENAI_API_KEY or GROQ_API_KEY to .env.local." },
        { status: 500 }
      );
    }

    const brief = await extractBrief(messages);
    return NextResponse.json(brief);
  } catch (error) {
    console.error("Brief extraction route error:", error);
    const message = error instanceof Error ? error.message : "Brief extraction failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
