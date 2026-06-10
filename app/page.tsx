"use client"
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import PromptForgeApp from "../components/PromptForgeApp";
import TerminalLanding from "../components/TerminalLanding";

export default function Home() {
  const [isUnlocked, setIsUnlocked] = useState(false);

  return (
    <main style={{ width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative', background: '#0d1117' }}>
      <AnimatePresence mode="wait">
        {!isUnlocked ? (
          <motion.div
            key="terminal"
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3, ease: "easeIn" }}
            style={{ width: '100%', height: '100%' }}
          >
            <TerminalLanding onUnlock={() => setIsUnlocked(true)} />
          </motion.div>
        ) : (
          <motion.div
            key="app"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            style={{ width: '100%', height: '100%' }}
          >
            <PromptForgeApp />
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
