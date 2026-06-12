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
import { buildHybridIndex, searchHybrid, formatRagContext, HybridIndex, ChunkFilter } from "../lib/rag/retriever";
import { retrieveAdvanced } from "../lib/rag/advancedRetrieval";
import { embedQuery } from "../lib/rag/embeddings";
import { runTournament } from "../lib/advanced";
import { Tournament } from "../lib/types";
import type { ReviewResult } from "../lib/review";
import { motion } from "framer-motion";

const FRESH_TOURNAMENT: Tournament = {
  status: "running",
  stage: "Starting tournament…",
  testcases: [],
  candidates: [],
  runs: [],
  scores: [],
};

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
  
  // Generation mode — Normal (single-shot) or Advanced (best-of-N tournament).
  // Drives generation behavior in Phase 2; for now it only toggles state.
  const [mode, setMode] = useState<'normal' | 'advanced'>('normal');

  // Metadata filtering: dataset ids the user has toggled OFF (excluded from
  // retrieval). Empty = all datasets active. Persisted across sessions.
  const [disabledDatasetIds, setDisabledDatasetIds] = useState<string[]>([]);

  // Resize and Collapse States
  const [leftWidth, setLeftWidth] = useState(260);
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);
  const [rightWidth, setRightWidth] = useState(400);
  const [isRightCollapsed, setIsRightCollapsed] = useState(false);

  // Mobile presentation: which pane fills the phone screen (chat or output),
  // and the sidebar becomes an off-canvas drawer (starts closed on phones).
  const [mobileView, setMobileView] = useState<'chat' | 'output'>('chat');
  useEffect(() => {
    if (window.matchMedia('(max-width: 767px)').matches) setIsLeftCollapsed(true);
  }, []);

  // RAG Index State (hybrid: BM25 + vector)
  const ragIndexRef = useRef<HybridIndex | null>(null);

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
        ragIndexRef.current = buildHybridIndex(allChunks);
        const embedded = ragIndexRef.current.vectors.length;
        console.log(`[RAG] Hybrid index built: ${allChunks.length} chunks (${embedded} embedded)`);
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

  // Load persisted dataset-filter selection once on mount.
  useEffect(() => {
    try {
      const stored = localStorage.getItem('dpe_disabled_datasets');
      if (stored) setDisabledDatasetIds(JSON.parse(stored));
    } catch (err) {
      console.error('[RAG] Failed to load dataset filter:', err);
    }
  }, []);

  // Toggle a dataset in/out of retrieval and persist the choice.
  const handleToggleDataset = useCallback((id: string) => {
    setDisabledDatasetIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      try {
        localStorage.setItem('dpe_disabled_datasets', JSON.stringify(next));
      } catch (err) {
        console.error('[RAG] Failed to persist dataset filter:', err);
      }
      return next;
    });
  }, []);

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

  // Advanced mode: run the best-of-N tournament, narrating progress into the
  // session, then promote the winning candidate to the generated prompt.
  const runAdvanced = async (
    sessionId: string,
    conversation: Message[],
    seedPrompt: string
  ) => {
    setIsGeneratingPrompt(true);
    // Reset any prior tournament state for this session.
    setSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, tournament: { ...FRESH_TOURNAMENT } } : s))
    );

    try {
      const finalTournament = await runTournament(conversation, seedPrompt, (patch) => {
        setSessions((prev) =>
          prev.map((s) =>
            s.id === sessionId
              ? { ...s, tournament: { ...(s.tournament ?? FRESH_TOURNAMENT), ...patch } }
              : s
          )
        );
      });

      const winner =
        finalTournament.candidates.find((c) => c.id === finalTournament.winnerId) ??
        finalTournament.candidates[0];

      const winningPrompt = winner?.prompt ?? seedPrompt;
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId
            ? {
                ...s,
                tournament: finalTournament,
                generatedPrompt: {
                  content: winningPrompt,
                  createdAt: new Date(),
                  sessionId,
                },
              }
            : s
        )
      );
      // QA-improve the winner, then run the responsible-AI review on it.
      await finalizePrompt(sessionId, winningPrompt);
    } catch (err) {
      console.error("[Advanced] Tournament failed:", err);
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId
            ? {
                ...s,
                tournament: {
                  ...(s.tournament ?? FRESH_TOURNAMENT),
                  status: "error",
                  stage: "Tournament failed",
                  error: err instanceof Error ? err.message : "Tournament failed.",
                },
              }
            : s
        )
      );
    } finally {
      setIsGeneratingPrompt(false);
    }
  };

  // Unified review pass: score engineering quality AND check the constitution
  // in ONE API call (replaces the separate quality + responsible passes). If the
  // reviewer returns a rewrite (low score or a constitution breach), promote it.
  const runReview = async (sessionId: string, finalPrompt: string) => {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId ? { ...s, reviewStatus: "reviewing", reviewError: undefined } : s
      )
    );

    try {
      const res = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: finalPrompt }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Review failed.");
      }
      const review: ReviewResult = await res.json();
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id !== sessionId) return s;
          const next = { ...s, review, reviewStatus: "done" as const };
          // A rewrite means the prompt fell short on quality or breached a rule —
          // show the corrected version.
          if (!review.rewriteSkipped && review.rewrite) {
            next.generatedPrompt = {
              content: review.rewrite,
              createdAt: new Date(),
              sessionId,
            };
          }
          return next;
        })
      );
    } catch (err) {
      console.error("[Review] Review failed:", err);
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId
            ? {
                ...s,
                reviewStatus: "error",
                reviewError: err instanceof Error ? err.message : "Review failed.",
              }
            : s
        )
      );
    }
  };

  // Finalize pipeline: run the unified review on the final prompt. Used by both
  // Normal and Advanced modes once a final prompt exists.
  const finalizePrompt = async (sessionId: string, prompt: string) => {
    await runReview(sessionId, prompt);
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
      const index = ragIndexRef.current;
      if (index && index.bm25.docCount > 0) {
        // Metadata filtering: drop chunks from datasets the user toggled off.
        const disabledSet = new Set(disabledDatasetIds);
        const datasetFilter: ChunkFilter | undefined =
          disabledSet.size > 0 ? (c) => !disabledSet.has(c.datasetId) : undefined;

        let results;
        if (mode === 'advanced') {
          // Advanced retrieval: multi-query + HyDE expansion, RRF fusion, LLM re-rank.
          results = await retrieveAdvanced(index, text, 5, datasetFilter);
        } else {
          // Normal retrieval: single-query hybrid search (fast, no extra LLM calls).
          // Embed the query only when there are vectors to match against —
          // this reuses the already-downloaded model, so it stays fast.
          let queryVec: number[] | undefined;
          if (index.vectors.length > 0) {
            try {
              queryVec = await embedQuery(text);
            } catch (embErr) {
              console.error('[RAG] Query embedding failed, using keyword-only:', embErr);
            }
          }
          results = searchHybrid(index, text, queryVec, 5, datasetFilter);
        }
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

              // Normal mode: the seed prompt is the final answer.
              // Advanced mode: run the tournament and promote the winner.
              if (mode === "advanced") {
                runAdvanced(activeSessionId, updatedMessages, promptText);
              } else {
                setIsGeneratingPrompt(false);
                // QA-improve the prompt, then run the responsible-AI review.
                finalizePrompt(activeSessionId, promptText);
              }
            } else {
              setIsGeneratingPrompt(false);
            }
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
      {/* Mobile layout: the sidebar docks off-canvas and panes go full-width. */}
      <style>{`
        @media (max-width: 767px) {
          .ws-left {
            position: fixed; top: 0; bottom: 0; left: 0; z-index: 60;
            width: 280px !important; min-width: 280px !important; max-width: 85vw !important;
            transform: translateX(var(--ws-left-x, 0));
            transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            box-shadow: 24px 0 60px rgba(0, 0, 0, 0.55);
          }
          .ws-left > div { width: 100% !important; }
          .ws-right { width: 100% !important; min-width: 100% !important; max-width: 100% !important; padding-top: 56px; background: var(--surface); }
          .ws-right > div { width: 100% !important; }
        }
      `}</style>

      {/* LEFT SIDEBAR WRAPPER */}
      <div
        className="ws-left"
        style={{
          width: isLeftCollapsed ? 0 : `${leftWidth}px`,
          minWidth: isLeftCollapsed ? 0 : '200px',
          maxWidth: isLeftCollapsed ? 0 : '600px',
          transition: 'width 0.3s cubic-bezier(0.16, 1, 0.3, 1), min-width 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          overflow: 'hidden',
          flexShrink: 0,
          ['--ws-left-x' as string]: isLeftCollapsed ? '-110%' : '0%',
        }}
      >
        <div className="ws-boot-left" style={{ width: `${leftWidth}px`, height: '100%' }}>
          <Sidebar
            sessions={sessions}
            activeSessionId={activeSessionId}
            onSelectSession={handleSelectSession}
            onNewSession={handleNewSession}
            onDeleteSession={handleDeleteSession}
            onDatasetsChange={rebuildRagIndex}
            mode={mode}
            setMode={setMode}
            disabledDatasetIds={disabledDatasetIds}
            onToggleDataset={handleToggleDataset}
          />
        </div>
      </div>

      {/* Mobile scrim behind the open sidebar drawer */}
      {!isLeftCollapsed && (
        <div
          className="md:hidden ws-scrim"
          onClick={() => setIsLeftCollapsed(true)}
          style={{
            position: 'fixed', inset: 0, zIndex: 55,
            background: 'rgba(1, 4, 9, 0.65)',
            backdropFilter: 'blur(2px)',
          }}
        />
      )}

      {/* LEFT DRAG HANDLE */}
      {!isLeftCollapsed && (
        <div
          className="hidden md:block"
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
      <>
          <div className={`${mobileView === 'output' ? 'hidden md:flex' : 'flex'} ws-boot-up flex-1 flex-col h-full overflow-hidden relative`}>
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
      <div className={`${mobileView === 'output' ? 'block' : 'hidden'} md:block ws-right`}
        style={{
          width: isRightCollapsed ? 0 : `${rightWidth}px`,
          minWidth: isRightCollapsed ? 0 : '300px',
          maxWidth: isRightCollapsed ? 0 : '800px',
          transition: 'width 0.3s cubic-bezier(0.16, 1, 0.3, 1), min-width 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        <div className="ws-boot-right" style={{ width: `${rightWidth}px`, height: '100%' }}>
          <OutputPanel
            prompt={generatedPrompt}
            isGenerating={isGeneratingPrompt}
            version={promptVersion}
            onRefine={handleRefine}
            isLoadingChat={isLoading}
            tournament={activeSession?.tournament}
            review={activeSession?.review}
            reviewStatus={activeSession?.reviewStatus}
            reviewError={activeSession?.reviewError}
          />
            </div>
          </div>
        </>

      {/* Mobile pane switcher — the output panel is unreachable on phones otherwise. */}
      <div
        className="flex md:hidden"
        style={{
          position: 'fixed', top: '12px', left: '50%', transform: 'translateX(-50%)',
          zIndex: 50, gap: '4px',
          background: 'rgba(22, 27, 34, 0.92)',
          border: '1px solid var(--border)',
          borderRadius: '999px', padding: '4px',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 12px 40px rgba(0, 0, 0, 0.6)',
        }}
      >
        {(['chat', 'output'] as const).map(v => (
          <button
            key={v}
            onClick={() => setMobileView(v)}
            style={{
              position: 'relative', padding: '6px 18px', borderRadius: '999px',
              border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-mono)', fontSize: '11px',
              textTransform: 'uppercase', letterSpacing: '0.07em',
              background: mobileView === v ? 'var(--accent-light)' : 'transparent',
              color: mobileView === v ? 'var(--accent-soft)' : 'var(--text-3)',
              boxShadow: mobileView === v ? 'inset 0 0 0 1px var(--accent-border)' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            {v}
            {v === 'output' && generatedPrompt && mobileView !== 'output' && (
              <span style={{
                position: 'absolute', top: '5px', right: '8px',
                width: '5px', height: '5px', borderRadius: '50%',
                background: 'var(--green)',
              }} />
            )}
          </button>
        ))}
      </div>
    </motion.div>
  );
}
