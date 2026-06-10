import { Session } from "./types";

const LOCAL_STORAGE_KEY = "promptforge_sessions";

export function loadSessions(): Session[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    
    // Convert date strings back to Date objects
    return parsed.map((s: any) => ({
      ...s,
      createdAt: new Date(s.createdAt),
      messages: (s.messages || []).map((m: any) => ({
        ...m,
        timestamp: new Date(m.timestamp),
      })),
      generatedPrompt: s.generatedPrompt
        ? {
            ...s.generatedPrompt,
            createdAt: new Date(s.generatedPrompt.createdAt),
          }
        : undefined,
    }));
  } catch (error) {
    console.error("Error loading sessions from localStorage:", error);
    return [];
  }
}

export function saveSessions(sessions: Session[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(sessions));
  } catch (error) {
    console.error("Error saving sessions to localStorage:", error);
  }
}

export function deleteSession(id: string): void {
  const sessions = loadSessions();
  const filtered = sessions.filter((s) => s.id !== id);
  saveSessions(filtered);
}

export function upsertSession(session: Session): void {
  const sessions = loadSessions();
  const index = sessions.findIndex((s) => s.id === session.id);
  if (index !== -1) {
    sessions[index] = session;
  } else {
    sessions.unshift(session);
  }
  saveSessions(sessions);
}
