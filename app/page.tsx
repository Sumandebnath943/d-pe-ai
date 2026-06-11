"use client"
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import PromptForgeApp from "../components/PromptForgeApp";
import TerminalLanding from "../components/TerminalLanding";
import MatrixTransition from "../components/MatrixTransition";

type Phase = "terminal" | "glitch" | "app";

export default function Home() {
  const [phase, setPhase] = useState<Phase>("terminal");

  return (
    <main style={{ width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative', background: '#010409' }}>
      <AnimatePresence mode="wait">
        {phase === "terminal" && (
          <motion.div
            key="terminal"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{ width: '100%', height: '100%' }}
          >
            <TerminalLanding onUnlock={() => setPhase("glitch")} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Glitch-in-the-matrix hand-off between the console and the workspace. */}
      {phase === "glitch" && <MatrixTransition onComplete={() => setPhase("app")} />}

      {phase === "app" && (
        <motion.div
          key="app"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          style={{ width: '100%', height: '100%' }}
        >
          <PromptForgeApp />
        </motion.div>
      )}
    </main>
  );
}
