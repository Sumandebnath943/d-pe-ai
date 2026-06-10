"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Message, Session } from "../lib/types";
import Sidebar from "./Sidebar";
import ChatPanel from "./ChatPanel";
import OutputPanel from "./OutputPanel";
import { streamChat } from "../lib/streaming";
import { loadSessions, saveSessions } from "../lib/sessions";
import { PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen } from "lucide-react";
import { getMemories, formatMemoriesForPrompt } from "../lib/memory";
import { getAllChunks } from "../lib/rag/store";
import { buildIndex, search, formatRagContext, BM25Index } from "../lib/rag/retriever";
import LabWorkspace from "./LabWorkspace";
import { motion } from "framer-motion";

const generateUUID = () => {
  if (typeof window !== "undefined" && window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  return `sess-${Math.random().toString(36).substring(2, 11)}-${Date.now()}`;
};

export default function PromptForgeApp() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
  
  // Workspace Mode (Phase 2)
  const [workspaceMode, setWorkspaceMode] = useState<'forge' | 'lab'>('forge');

  // Resize and Collapse States
  const [leftWidth, setLeftWidth] = useState(260);
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);
  const [rightWidth, setRightWidth] = useState(400);
  const [isRightCollapsed, setIsRightCollapsed] = useState(false);

  // RAG Index State
  const ragIndexRef = useRef<BM25Index | null>(null);

  const isLoadedRef = useRef(false);

  // 1. On Mount: Load sessions from localStorage or bootstrap a blank session
  // 2. On Mount: Check URL query parameters for ?p=[base64] sharing link
  useEffect(() => {
    // A. Check localStorage first
    const loaded = loadSessions();
    let initialActiveId = "";

    if (loaded.length > 0) {
      setSessions(loaded);
      const sorted = [...loaded].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      initialActiveId = sorted[0].id;
    } else {
      const initialId = generateUUID();
      const initialSession: Session = {
        id: initialId,
        title: "New Workspace Session",
        createdAt: new Date(),
        messages: [],
        promptVersion: 1,
      };
      setSessions([initialSession]);
      initialActiveId = initialId;
    }

    setActiveSessionId(initialActiveId);

    // B. Check URL sharing param
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const sharedParam = params.get("p");
      if (sharedParam) {
        try {
          const decodedPrompt = decodeURIComponent(atob(sharedParam));
          const sharedId = `shared-${Date.now()}`;
          const sharedSession: Session = {
            id: sharedId,
            title: "Shared Prompt Preview",
            createdAt: new Date(),
            messages: [
              {
                id: `msg-${Date.now()}-shared`,
                role: "assistant",
                content:
                  "This prompt was loaded via a shared link. You can use the panel on the right to read, export, or submit refinement instructions.",
                timestamp: new Date(),
              },
            ],
            generatedPrompt: {
              content: decodedPrompt,
              createdAt: new Date(),
              sessionId: sharedId,
            },
            promptVersion: 1,
          };

          setSessions((prev) => [sharedSession, ...prev]);
          setActiveSessionId(sharedId);
          
          // Clear query params so it behaves like a normal workspace on next interactions
          window.history.replaceState({}, document.title, window.location.origin);
        } catch (error) {
          console.error("Failed to decode shared prompt:", error);
        }
      }
    }

    isLoadedRef.current = true;
  }, []);

  // Build RAG index on mount and when datasets change
  const rebuildRagIndex = useCallback(async () => {
    try {
      const allChunks = await getAllChunks();
      if (allChunks.length > 0) {
        ragIndexRef.current = buildIndex(allChunks);
        console.log(`[RAG] Index built: ${allChunks.length} chunks`);
      } else {
        ragIndexRef.current = null;
      }
    } catch (err) {
      console.error('[RAG] Failed to build index:', err);
      ragIndexRef.current = null;
    }
  }, []);

  useEffect(() => {
    rebuildRagIndex();
  }, [rebuildRagIndex]);

  // Save sessions list state changes back to localStorage
  useEffect(() => {
    if (isLoadedRef.current && sessions.length > 0) {
      saveSessions(sessions);
    }
  }, [sessions]);

  // Register Global Keyboard Shortcuts: Ctrl+K / Cmd+K -> Start New Session
  useEffect(() => {
    const handleGlobalShortcuts = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        handleNewSession();
      }
    };
    window.addEventListener("keydown", handleGlobalShortcuts);
    return () => window.removeEventListener("keydown", handleGlobalShortcuts);
  }, [sessions, activeSessionId]);

  // Helper variables for active workspace details
  const activeSession = sessions.find((s) => s.id === activeSessionId) || null;
  const messages = activeSession ? activeSession.messages : [];
  const generatedPrompt = activeSession?.generatedPrompt?.content || null;
  const promptVersion = activeSession?.promptVersion || 1;

  // Selecting a session
  const handleSelectSession = (id: string) => {
    setActiveSessionId(id);
  };

  // Creating a new session (prompts for confirmation if current active is unsaved)
  const handleNewSession = () => {
    const hasUnsavedWork =
      activeSession &&
      activeSession.messages.length > 0 &&
      !activeSession.generatedPrompt;

    if (hasUnsavedWork) {
      const confirmFresh = confirm(
        "Are you sure you want to start a new session? The current prompt is not yet generated."
      );
      if (!confirmFresh) return;
    }

    const newId = generateUUID();
    const newSession: Session = {
      id: newId,
      title: "New Workspace Session",
      createdAt: new Date(),
      messages: [],
      promptVersion: 1,
    };

    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newId);
    setIsLoading(false);
    setIsGeneratingPrompt(false);
  };

  // Reset the current workspace session
  const handleStartOver = () => {
    if (!activeSessionId) return;
    const newId = generateUUID();

    setSessions((prev) =>
      prev.map((s) => {
        if (s.id === activeSessionId) {
          return {
            ...s,
            id: newId,
            title: "New Workspace Session",
            messages: [],
            generatedPrompt: undefined,
            promptVersion: 1,
          };
        }
        return s;
      })
    );
    setActiveSessionId(newId);
    setIsLoading(false);
    setIsGeneratingPrompt(false);
  };

  // Deleting an individual session
  const handleDeleteSession = (id: string) => {
    const remaining = sessions.filter((s) => s.id !== id);
    setSessions(remaining);

    // If active session was deleted, focus next most recent
    if (activeSessionId === id) {
      if (remaining.length > 0) {
        const sorted = [...remaining].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        setActiveSessionId(sorted[0].id);
      } else {
        // Bootstrap a blank fallback if empty
        const newId = generateUUID();
        const fallbackSession: Session = {
          id: newId,
          title: "New Workspace Session",
          createdAt: new Date(),
          messages: [],
          promptVersion: 1,
        };
        setSessions([fallbackSession]);
        setActiveSessionId(newId);
      }
    }
  };

  // Main chat sending execution with real streaming tokens
  const handleSend = async (text: string, isReverseEngineer: boolean = false) => {
    if (!activeSessionId) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}-user`,
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    // Form title from first user message
    let updatedTitle = activeSession?.title || "New Workspace Session";
    if (messages.length === 0 || updatedTitle === "New Workspace Session") {
      updatedTitle = text.length > 40 ? `${text.substring(0, 37)}...` : text;
    }

    const updatedMessages = [...messages, userMessage];

    // Update active session with user message and set title
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id === activeSessionId) {
          return {
            ...s,
            title: updatedTitle,
            messages: updatedMessages,
          };
        }
        return s;
      })
    );

    setIsLoading(true);

    // Append streaming blank assistant bubble
    const aiMessageId = `msg-${Date.now()}-ai`;
    const initialAiMsg: Message = {
      id: aiMessageId,
      role: "assistant",
      content: "",
      timestamp: new Date(),
    };

    setSessions((prev) =>
      prev.map((s) => {
        if (s.id === activeSessionId) {
          return {
            ...s,
            messages: [...updatedMessages, initialAiMsg],
          };
        }
        return s;
      })
    );

    let fullResponse = "";

    // Retrieve memory and RAG context
    let memoriesText = '';
    let ragContextText = '';

    try {
      const memories = getMemories();
      if (memories.length > 0) {
        memoriesText = formatMemoriesForPrompt(memories);
      }
    } catch (err) {
      console.error('[Memory] Failed to load memories:', err);
    }

    try {
      if (ragIndexRef.current && ragIndexRef.current.docCount > 0) {
        const results = search(ragIndexRef.current, text, 5);
        if (results.length > 0) {
          ragContextText = formatRagContext(results);
        }
      }
    } catch (err) {
      console.error('[RAG] Failed to search index:', err);
    }

    try {
      await streamChat(
        updatedMessages,
        isReverseEngineer ? "reverse_engineer" : "interview",
        (token) => {
          fullResponse += token;

          if (fullResponse.includes("[PROMPT_READY]")) {
            setIsGeneratingPrompt(true);
          }

          setSessions((prev) =>
            prev.map((s) => {
              if (s.id === activeSessionId) {
                return {
                  ...s,
                  messages: s.messages.map((m) =>
                    m.id === aiMessageId ? { ...m, content: fullResponse } : m
                  ),
                };
              }
              return s;
            })
          );
        },
        () => {
          setIsLoading(false);

          const readyIndex = fullResponse.indexOf("[PROMPT_READY]");
          if (readyIndex !== -1) {
            const startTag = "[PROMPT_START]";
            const endTag = "[PROMPT_END]";
            const startIndex = fullResponse.indexOf(startTag);
            const endIndex = fullResponse.indexOf(endTag);

            if (startIndex !== -1 && endIndex !== -1) {
              const promptText = fullResponse
                .substring(startIndex + startTag.length, endIndex)
                .trim();
              const cleanChatText = fullResponse.substring(0, readyIndex).trim();

              setSessions((prev) =>
                prev.map((s) => {
                  if (s.id === activeSessionId) {
                    return {
                      ...s,
                      messages: s.messages.map((m) =>
                        m.id === aiMessageId ? { ...m, content: cleanChatText } : m
                      ),
                      generatedPrompt: {
                        content: promptText,
                        createdAt: new Date(),
                        sessionId: activeSessionId,
                      },
                    };
                  }
                  return s;
                })
              );
            }
            setIsGeneratingPrompt(false);
          }
        },
        memoriesText || undefined,
        ragContextText || undefined
      );
    } catch (error: any) {
      console.error("Chat engine failed:", error);
      setIsLoading(false);
      setIsGeneratingPrompt(false);

      const errorText = `⚠️ Error: ${
        error.message || "Failed to communicate with Claude API."
      }`;

      setSessions((prev) =>
        prev.map((s) => {
          if (s.id === activeSessionId) {
            return {
              ...s,
              messages: s.messages.map((m) =>
                m.id === aiMessageId ? { ...m, content: errorText } : m
              ),
            };
          }
          return s;
        })
      );
    }
  };

  // Refine action: Appends instructions, increments version counter, and triggers prompt regenerations
  const handleRefine = (refinementText: string) => {
    if (!activeSessionId) return;

    const nextVersion = promptVersion + 1;

    setSessions((prev) =>
      prev.map((s) => {
        if (s.id === activeSessionId) {
          return {
            ...s,
            promptVersion: nextVersion,
          };
        }
        return s;
      })
    );

    handleSend(refinementText);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
      className="flex flex-row h-screen w-full bg-[var(--bg)] overflow-hidden text-ui text-[var(--text-1)] select-none relative"
    >
      {/* LEFT SIDEBAR WRAPPER */}
      <div 
        style={{
          width: isLeftCollapsed ? 0 : `${leftWidth}px`,
          minWidth: isLeftCollapsed ? 0 : '200px',
          maxWidth: isLeftCollapsed ? 0 : '600px',
          transition: 'width 0.3s cubic-bezier(0.16, 1, 0.3, 1), min-width 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        <div style={{ width: `${leftWidth}px`, height: '100%' }}>
          <Sidebar
            sessions={sessions}
            activeSessionId={activeSessionId}
            onSelectSession={handleSelectSession}
            onNewSession={handleNewSession}
            onDeleteSession={handleDeleteSession}
            onDatasetsChange={rebuildRagIndex}
            workspaceMode={workspaceMode}
            setWorkspaceMode={setWorkspaceMode}
          />
        </div>
      </div>

      {/* LEFT DRAG HANDLE */}
      {!isLeftCollapsed && (
        <div 
          onMouseDown={(e) => {
            e.preventDefault();
            const startX = e.pageX;
            const startWidth = leftWidth;
            const onMouseMove = (moveEvent: MouseEvent) => {
              const newWidth = Math.max(200, Math.min(600, startWidth + (moveEvent.pageX - startX)));
              setLeftWidth(newWidth);
            };
            const onMouseUp = () => {
              document.removeEventListener('mousemove', onMouseMove);
              document.removeEventListener('mouseup', onMouseUp);
            };
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
          }}
          style={{
            width: '4px',
            cursor: 'col-resize',
            background: 'transparent',
            position: 'absolute',
            left: `${leftWidth - 2}px`,
            top: 0,
            bottom: 0,
            zIndex: 30,
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--border)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        />
      )}

      {/* MAIN CENTER WRAPPER */}
      {workspaceMode === 'forge' ? (
        <>
          <div className="flex flex-1 flex-col h-full overflow-hidden relative">
            {/* Toggle Buttons Floating Layer */}
            <div style={{
              position: 'absolute',
              top: '16px',
              left: '16px',
              right: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              pointerEvents: 'none',
              zIndex: 40
            }}>
          <button 
            onClick={() => setIsLeftCollapsed(!isLeftCollapsed)}
            style={{
              pointerEvents: 'auto',
              background: 'none',
              border: 'none',
              borderRadius: '6px',
              padding: '6px',
              cursor: 'pointer',
              color: 'var(--text-3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s'
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-1)'; e.currentTarget.style.background = 'var(--surface-2)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-3)'; e.currentTarget.style.background = 'none' }}
          >
             {isLeftCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
          
          <button 
            onClick={() => setIsRightCollapsed(!isRightCollapsed)}
            className="hidden md:flex"
            style={{
              pointerEvents: 'auto',
              background: 'none',
              border: 'none',
              borderRadius: '6px',
              padding: '6px',
              cursor: 'pointer',
              color: 'var(--text-3)',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s'
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-1)'; e.currentTarget.style.background = 'var(--surface-2)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-3)'; e.currentTarget.style.background = 'none' }}
          >
             {isRightCollapsed ? <PanelRightOpen size={16} /> : <PanelRightClose size={16} />}
          </button>
        </div>

        <ChatPanel
          messages={messages}
          isLoading={isLoading}
          onSend={handleSend}
          onStartOver={handleStartOver}
        />
      </div>

      {/* RIGHT DRAG HANDLE */}
      {!isRightCollapsed && (
        <div 
          className="hidden md:block"
          onMouseDown={(e) => {
            e.preventDefault();
            const startX = e.pageX;
            const startWidth = rightWidth;
            const onMouseMove = (moveEvent: MouseEvent) => {
              const newWidth = Math.max(300, Math.min(800, startWidth - (moveEvent.pageX - startX)));
              setRightWidth(newWidth);
            };
            const onMouseUp = () => {
              document.removeEventListener('mousemove', onMouseMove);
              document.removeEventListener('mouseup', onMouseUp);
            };
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
          }}
          style={{
            width: '4px',
            cursor: 'col-resize',
            background: 'transparent',
            position: 'absolute',
            right: `${rightWidth - 2}px`,
            top: 0,
            bottom: 0,
            zIndex: 30,
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--border)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        />
      )}

      {/* RIGHT OUTPUT PANEL WRAPPER */}
      <div className="hidden md:block"
        style={{
          width: isRightCollapsed ? 0 : `${rightWidth}px`,
          minWidth: isRightCollapsed ? 0 : '300px',
          maxWidth: isRightCollapsed ? 0 : '800px',
          transition: 'width 0.3s cubic-bezier(0.16, 1, 0.3, 1), min-width 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        <div style={{ width: `${rightWidth}px`, height: '100%' }}>
          <OutputPanel
            prompt={generatedPrompt}
            isGenerating={isGeneratingPrompt}
            version={promptVersion}
            onRefine={handleRefine}
            isLoadingChat={isLoading}
          />
            </div>
          </div>
        </>
      ) : (
        <LabWorkspace />
      )}
    </motion.div>
  );
}
