# Roulette Simulator

A full-stack application built with **React, TypeScript, Vite, and Tailwind CSS** for simulating and managing roulette strategies. The application allows users to create, edit, test, and analyze complex betting strategies directly in the browser.

## Architecture

- **Frontend**: React + Vite (serving at `http://localhost:5173/` by default). State management via Zustand, code editing via Monaco Editor.
- **Backend**: Express + Node.js (serving API at `http://localhost:3001/` by default). Manages the filesystem and serves files from the `strategies/` directory.
- **Dev Runner**: A custom orchestrator (`scripts/dev-runner.js`) spins up both the frontend and backend simultaneously. It ensures a free port is found for the API (via the `API_PORT` environment variable) and handles child process lifecycles.

## 🚀 Development Server Stability Guidelines

### Running the App

To start the app locally:
```bash
npm run dev
```

### ⚠️ CRITICAL: IDE Sandbox & Automated Testing Stability

If you are running this app via an automated IDE terminal or a sandbox wrapper (such as Trae's terminal), executing `npm run dev` as a standard background command might result in a premature `SIGINT` when the terminal detaches. This causes `dev-runner.js` to kill both the frontend and backend servers, leading to a `net::ERR_ABORTED` error in the browser.

**To ensure absolute stability and prevent the app from failing during iterations**, use the following PowerShell command instead:

```powershell
Start-Process -FilePath "node" -ArgumentList "scripts/dev-runner.js" -WindowStyle Hidden
```
*(This detaches the node process completely from the IDE terminal session, guaranteeing it stays alive.)*

When you need to stop the servers later, simply run:
```powershell
taskkill /F /IM node.exe
```

### Future Iteration Rules

Every future update to the development environment, server configuration, or build pipeline MUST adhere to these stability constraints:
1. **Dynamic Ports**: `scripts/dev-runner.js` dynamically assigns a free port to the Express backend and passes it to the frontend via the `API_PORT` environment variable. Do not hardcode ports in a way that breaks this behavior.
2. **Process Management**: Do not remove the graceful shutdown logic (handling `SIGINT`/`SIGTERM`/`exit`) inside `dev-runner.js`. The runner must clean up its child processes when properly signaled.
3. **No Breaking Changes**: Before modifying `vite.config.ts`, `server/server.js`, or `scripts/dev-runner.js`, consider how it will affect the automated sandbox startup. Changes that break the detached `Start-Process` startup method are strictly prohibited.
