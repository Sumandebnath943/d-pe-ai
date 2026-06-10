# D-PE.ai - Project Handoff Document

Welcome to the official handoff document for **D-PE.ai** (God-Tier Prompt Engineering). This document serves as a comprehensive map of the application architecture, feature set, and technical decisions made during development.

---

## 1. Project Overview
**D-PE.ai** is a premium, developer-focused prompt engineering workspace designed to elevate raw text into structured, production-ready AI prompts. It utilizes a Socratic interview engine to extract missing context from the user and applies rigorous 9-pillar architectural frameworks to generate optimal outputs.

### Tech Stack
* **Framework:** Next.js 14 (App Router)
* **Language:** TypeScript
* **Styling:** CSS Modules / Vanilla CSS (Tailwind where applicable), dynamically mapped CSS variables for theming.
* **Animations:** Framer Motion
* **Typography:** Manrope (Sans), Instrument Serif (Serif - used selectively), DM Mono (Monospace), JetBrains Mono (Terminal).
* **Icons:** Lucide React & Custom SVGs (The Quill Logo).

---

## 2. Core Architecture & File Structure

The project follows a modular Next.js structure. Here are the most critical files and directories to know:

### `/app` (Routing & Layouts)
* `layout.tsx`: The root layout. This handles the global font injection (Manrope, DM Mono, Instrument Serif) and HTML metadata (Site Title & Favicon).
* `page.tsx`: The main entry point. It manages the state transition between the Sarcastic Terminal Landing Page and the actual Workspace UI using Framer Motion crossfades.
* `globals.css`: Contains all CSS variable tokens (`--bg`, `--text-1`, `--accent`). The dark mode toggle in the app works by appending a `.dark-theme` class to the HTML which overrides these variables.

### `/components` (UI Elements)
* `TerminalLanding.tsx`: The interactive landing page. It houses the "Sarcasm Engine" (`JOKE_COMMANDS` and `FALLBACK_JOKES`), the ASCII art boot sequence, and the regex-powered syntax highlighter for the git commit graph.
* `PromptForgeApp.tsx`: The primary wrapper for the authenticated workspace.
* `Sidebar.tsx`: Manages active sessions, the Memory Drawer toggle, Dark Mode toggle, and renders the official D-PE.ai Quill SVG logo.
* `ChatPanel.tsx`: The heart of the Socratic interview process where the user iterates on their prompt.

### `/lib` (Business Logic)
* `streaming.ts`: Handles the LLM streaming logic, separating "interview" mode from "generate" mode.
* `sessions.ts`: LocalStorage management for chat histories and active prompt sessions.
* `types.ts`: TypeScript interfaces ensuring strict typing across the application.

---

## 3. Key Features & Mechanics

### The Sarcastic Terminal Gateway
We explicitly built the landing page to feel like a premium hacker environment rather than a corporate SaaS site. 
* **Mechanic:** The user must interact with the bash terminal to enter the app.
* **Easter Eggs:** The terminal contains a sarcasm dictionary. Typing standard developer commands (`ls`, `npm run dev`, `sudo rm -rf /`) returns highly specific, condescending jokes from the AI.
* **Unlock:** Typing `init d-pe` triggers a cinematic "git fast-forward" animation and instantly checks the user into the main app.

### The Workspace Interface
* **The Socratic Engine:** Instead of just generating prompts blindly, the AI asks probing questions to identify missing context, constraints, and variables.
* **Aesthetics:** The UI is stripped of unnecessary glowing borders (glassmorphism) in favor of a highly structural, Git-like aesthetic. Backgrounds use dot-matrix textures and sharp 1px borders.
* **Typography:** The workspace strictly enforces the `Manrope` font to maintain absolute clarity and a modern feel, dropping serifs for functionality.

---

## 4. Maintenance & Future Expansion

### Adding New Sarcastic Terminal Commands
If you want to add more easter eggs to the landing page:
1. Open `components/TerminalLanding.tsx`.
2. Locate the `JOKE_COMMANDS` dictionary at the top of the file.
3. Add a new `key: value` pair where the key is the exact command (e.g., `'ping': 'Pong.'`). The engine automatically handles argument stripping.

### Modifying the Logo or Branding
* **Brand Name:** Global strings are located in `app/layout.tsx` (for the browser tab) and `components/Sidebar.tsx` (for the visible UI).
* **Logo:** The Quill logo is hardcoded as an SVG in `components/Sidebar.tsx` and duplicated as `app/icon.svg` for the browser favicon.

### Theming
To change the core colors (like the copper accent `#C4703F`), edit the `--accent` variable inside `:root` and `.dark-theme` in `app/globals.css`. All components dynamically inherit from these CSS variables.

---

## 5. Deployment
The project is currently version-controlled and hosted on GitHub at `Sumandebnath943/d-pe-ai`. 

To deploy:
1. Connect the GitHub repository to **Vercel**.
2. Add any necessary API keys (like `OPENAI_API_KEY`) to the Vercel Environment Variables section.
3. Deploy. Any future `git push origin main` commands from your local machine will automatically trigger a redeploy on Vercel.

**End of Handoff.**
