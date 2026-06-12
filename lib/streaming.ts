import { Message } from "./types";
import type { PromptBrief } from "./briefExtract";

export async function streamChat(
  messages: Message[],
  mode: "interview" | "generate" | "reverse_engineer",
  onToken: (token: string) => void,
  onDone: () => void,
  memories?: string,
  ragContext?: string
): Promise<void> {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ messages, mode, memories, ragContext }),
  });

  if (!response.ok) {
    let errorMessage = "An error occurred while communicating with the server.";
    try {
      const errData = await response.json();
      if (errData && errData.error) {
        errorMessage = errData.error;
      }
    } catch {
      // Fallback to default message if JSON parsing fails
    }
    throw new Error(errorMessage);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("Unable to initialize response stream reader.");
  }

  const decoder = new TextDecoder("utf-8");
  
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      const token = decoder.decode(value, { stream: true });
      onToken(token);
    }
  } catch (error) {
    console.error("Stream reading error:", error);
    throw error;
  } finally {
    reader.releaseLock();
    onDone();
  }
}

/**
 * Distill the interview transcript into a structured brief via /api/brief.
 * Throws on failure so the caller can fall back to full-transcript generation.
 */
export async function fetchBrief(
  messages: { role: string; content: string }[]
): Promise<PromptBrief> {
  const res = await fetch("/api/brief", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Brief extraction failed");
  }
  return res.json();
}

/**
 * Stream the generation step (/api/chat, mode "generate"). Sends either the
 * distilled brief or, as a fallback, the raw transcript. Streams the generated
 * prompt (wrapped in [PROMPT_START]/[PROMPT_END]) token by token.
 */
export async function streamGenerate(
  payload: { brief?: PromptBrief; transcript?: string },
  onToken: (token: string) => void,
  onDone: () => void
): Promise<void> {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "generate", ...payload }),
  });

  if (!response.ok) {
    let errorMessage = "An error occurred during prompt generation.";
    try {
      const errData = await response.json();
      if (errData && errData.error) errorMessage = errData.error;
    } catch {
      // keep default
    }
    throw new Error(errorMessage);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("Unable to initialize generation stream reader.");

  const decoder = new TextDecoder("utf-8");
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      onToken(decoder.decode(value, { stream: true }));
    }
  } catch (error) {
    console.error("Generation stream reading error:", error);
    throw error;
  } finally {
    reader.releaseLock();
    onDone();
  }
}
