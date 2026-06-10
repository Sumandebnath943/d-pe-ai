import { Message } from "./types";

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
