# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Desktop (Electron)
npm run dev          # Start development server with hot reload
npm run build:win    # Build for Windows (from Windows)
npm run build:mac    # Build for macOS (from macOS)

# Mobile (Capacitor)
npm run mobile:dev     # Start mobile dev server (browser preview)
npm run mobile:build   # Build web assets for mobile
npm run mobile:sync    # Build and sync to native projects
npm run mobile:ios     # Build, sync, and open in Xcode
npm run mobile:android # Build, sync, and open in Android Studio

# Testing & Quality
npm run test              # Run tests in watch mode (Vitest)
npm run test:run          # Run tests once
npm run test:coverage     # Run tests with coverage
npm run test:connection   # Test connection to OpenClaw server
npm run e2e               # Run E2E tests (Playwright)
npm run e2e:ui            # Run E2E tests with UI
npm run e2e:headed        # Run E2E tests in headed browser
npm run typecheck         # TypeScript type checking
npm run lint              # ESLint

# Run a single test file
npx vitest src/lib/openclaw-client.test.ts
npx playwright test e2e/tests/chat.spec.ts

# Test file locations
- Unit tests: `src/**/*.test.ts` (Vitest, JSDOM environment)
- E2E tests: `e2e/tests/*.spec.ts` (Playwright, mock WebSocket server)
- Test setup: `src/test/setup.ts`
- E2E config: `e2e/playwright.config.ts`
- E2E mock server: `e2e/mock-server/`
```

## Architecture

ClawControl is a cross-platform client for OpenClaw AI assistant. It runs as an Electron desktop app and as a native mobile app (iOS/Android) via Capacitor.

### Desktop Process Structure (Electron)
- **Main Process** (`electron/main.ts`): Electron main process, handles window creation and IPC
- **Preload** (`electron/preload.ts`): Bridge between main and renderer, exposes `window.electronAPI`
- **Renderer** (`src/`): React application

### Mobile Architecture (Capacitor)
- **Platform Layer** (`src/lib/platform.ts`): Abstraction over Electron/Capacitor/web APIs (token storage, external links, status bar, keyboard)
- **Capacitor Config** (`capacitor.config.ts`): Native app configuration
- **Vite Config** (`vite.config.mobile.ts`): Web build without Electron plugins
- **Native Projects**: `ios/` and `android/` directories (generated, gitignored)

### Platform Abstraction Layer
`src/lib/platform.ts` provides a unified API across all platforms:

| Feature | Electron | Capacitor (iOS/Android) | Web |
|---|---|---|---|
| Token storage | safeStorage (encrypted) | Preferences plugin | localStorage |
| External links | shell.openExternal | Browser plugin | window.open |
| Notifications | Notification API | LocalNotifications | Notification API |
| WebSocket factory | Browser WebSocket | NativeWebSocket (iOS) | Browser WebSocket |
| Certificate trust | IPC trustHost | clearTLSFingerprint | N/A |
| ClawHub install | ZIP download + extract | N/A | N/A |
| Ed25519 crypto | Node.js crypto | Web Crypto API | Web Crypto API |
| Haptic feedback | N/A | Haptics plugin | N/A |

### Authentication Flow
ClawControl uses **Ed25519 device identity pairing**:

1. Client creates WebSocket connection to server URL
2. Server sends `connect.challenge` event with nonce
3. Client performs handshake:
   - If device identity available: sign challenge and send with `deviceId`, `signature`, `publicKey`
   - If no device identity: send with `token/password` and `mode` only
4. Server responds with `hello-ok` (includes optional `deviceToken`)
5. Client stores `deviceToken` for future reconnects
6. If `NOT_PAIRED`: UI shows pairing instructions
7. If `DEVICE_IDENTITY_STALE`: client clears keypair and retries once

### Core Data Flow
1. **OpenClawClient** (`src/lib/openclaw/client.ts`): Custom WebSocket client implementing a frame-based JSON-RPC protocol (v3). Handles connection, authentication, and real-time message streaming with per-session stream isolation.
2. **Zustand Store** (`src/store/index.ts`): Central state management with persistence. All app state flows through here. Per-session streaming maps (`streamingSessions`, `sessionHadChunks`, `sessionToolCalls`) enable concurrent agent conversations.
3. **Components**: React components consume store state via `useStore()` hook.

### Client Module Structure (`src/lib/openclaw/`)
- `client.ts` — Core WebSocket connection, event routing, per-session stream state
- `types.ts` — Protocol frame types, domain interfaces (`Message`, `Session`, `Agent`, etc.)
- `chat.ts` — `chat.send`, `chat.history`, `chat.abort` RPC methods
- `sessions.ts` — Session CRUD and `sessions.spawn`
- `agents.ts` — Agent listing, identity, file management, create/delete
- `config.ts` — Server config read (`config.get`) and write (`config.patch`)
- `skills.ts` — Skill listing, toggle, install
- `cron-jobs.ts` — Cron job listing, toggle, details
- `utils.ts` — ANSI stripping, content extraction, heartbeat detection
- `index.ts` — Public re-exports

### Protocol Details
The OpenClaw protocol uses typed frames:
- `req`: Outgoing requests with `method` and `params`
- `res`: Responses with `ok` boolean and `payload`/`error`
- `event`: Server-pushed events like `chat`, `agent`, `presence`, `connect.challenge`

Key RPC methods: `sessions.list`, `sessions.spawn`, `sessions.patch`, `sessions.delete`, `chat.send`, `chat.history`, `chat.abort`, `agents.list`, `agent.identity.get`, `agents.files.list`, `agents.files.get`, `agents.files.set`, `config.get`, `config.patch`, `skills.status`, `skills.update`, `skills.install`, `cron.list`, `cron.get`, `cron.update`

### Streaming Architecture
The client uses **per-session stream isolation** via `Map<string, SessionStreamState>`. Each session independently tracks its stream source (chat vs agent), accumulated text, mode (delta vs cumulative), and content block offsets. This allows multiple agents to stream simultaneously without cross-contaminating text buffers.

Key streaming concepts:
- **Stream source arbitration**: First event type (`chat` or `agent`) to arrive for a session claims it; the other is ignored for that session to prevent duplicate content.
- **Cumulative text merging**: The server sends `data.text` as cumulative per-content-block (resets after tool calls). The client detects rewinds and accumulates with `\n\n` separators.
- **Parent session tracking**: `parentSessionKeys: Set<string>` tracks sessions the user has sent messages to. Events from unknown sessions trigger subagent detection.
- **Session key resolution**: Events without `sessionKey` fall back to `defaultSessionKey` (the most recent send target).

Server event types:
- `chat { state: "delta" }` — Cumulative text chunk with `delta` or `message.content`
- `chat { state: "final" }` — Complete message with canonical `message` object
- `agent { stream: "assistant" }` — Text output with `data.text` (cumulative) or `data.delta`
- `agent { stream: "tool" }` — Tool call start/result with `data.name`, `data.phase`, `data.result`
- `agent { stream: "lifecycle" }` — Agent lifecycle; `data.state: "complete"` or `data.phase: "end"` signals stream end
- `presence` — Agent online/offline status changes

All server events include an optional `sessionKey` field identifying which session they belong to.

### Component Layout
```
App
├── Sidebar          # Session list, collapsible
├── main-content
│   ├── TopBar       # Agent selector, theme toggle, settings
│   ├── ChatArea     # Message display with markdown support
│   ├── InputArea    # Message input with thinking mode toggle
│   ├── SkillDetailView  # Full skill details when selected
│   ├── CronJobDetailView
│   └── ServerSettingsView  # Full-page server config editor
├── RightPanel       # Skills/Crons tabs
└── Modals          # SettingsModal, CertErrorModal
```

### Main View Routing
The `mainView` state determines which component renders in the center:

| `mainView` value | Component | Description |
|---|---|---|
| `chat` | ChatArea + InputArea | Default chat interface |
| `skill-detail` | SkillDetailView | Individual skill inspector |
| `cron-detail` | CronJobDetailView | Cron job editor |
| `create-cron` | CreateCronJobView | New cron job form |
| `agent-detail` | AgentDetailView | Agent profile editor |
| `create-agent` | CreateAgentView | New agent form |
| `clawhub-skill-detail` | ClawHubSkillDetailView | ClawHub skill browser |
| `hook-detail` | HookDetailView | Hook configuration |
| `server-settings` | ServerSettingsView | Full server config editor |
| `usage` | UsageView | Usage statistics dashboard |
| `nodes` | NodesView | Node/device management |
| `pixel-dashboard` | AgentDashboard | Live agent activity grid |

### Module-Level State
Some state lives outside the Zustand store for performance or lifecycle reasons:

| Variable | Purpose |
|---|---|
| `_subagentPollTimer` | Interval ID for subagent polling |
| `_baselineSessionKeys` | Snapshot of session keys for subagent detection |
| `_sessionLoadVersion` | Counter for detecting stale async message loads |
| `_sessionMessagesCache` | `Map<string, Message[]>` for instant session switching |
| `_clawHubStatsCache` | Cached download/star counts from ClawHub |

### Event-Driven State Updates
The store registers handlers for client events during `connect()`:

| Client Event | Store Effect |
|---|---|
| `connected` | Set `connected=true`, clear pairing state |
| `disconnected` | Set `connected=false`, clear streaming state |
| `streamStart` | Mark session as streaming, start subagent polling |
| `streamChunk` | Append text to streaming message (or create new one) |
| `streamEnd` | Clear streaming state, notify if needed, stop polling |
| `message` | Replace streaming placeholder with final message |
| `toolCall` | Add/update tool call in session, finalize streaming message |
| `thinkingChunk` | Accumulate thinking text for session |
| `compaction` | Set/clear compacting indicator |
| `streamSessionKey` | Migrate session key when server assigns different key |
| `subagentDetected` | Add to activeSubagents list |
| `pairingRequired` | Show pairing UI |
| `certError` | Show certificate error modal |
| `reconnectExhausted` | Set disconnected, stop connecting |
| `execApprovalRequested` | Show notification |
| `agentStatus` | Update agent online/offline status |

### Server Settings View
The `ServerSettingsView` component (`src/components/ServerSettingsView.tsx`) provides a full-page editor for OpenClaw server configuration. It uses `config.get` to load the full config and `config.patch` to save changes.

Key design:
- **Three tabs**: Agent Defaults (model, thinking, limits), Tools & Memory (web tools, exec, memory backend), Channels (per-channel enable with policies)
- **Local state only**: Config is managed in component state, not Zustand, since it's a one-off read/write workflow
- **Dirty tracking**: Compares all editable paths between original and edited config to show/hide save bar
- **Minimal patch**: Only changed paths are included in the `config.patch` payload
- **Reconnect handling**: After save, waits for server restart/reconnect (same pattern as `createAgent`), then reloads fresh config
- **Hash-based conflict detection**: Uses `baseHash` from `config.get` to detect concurrent edits

Accessible via: Settings modal (gear icon) > "OpenClaw Server Settings" button (only shown when connected).

### State Persistence
The Zustand store persists to localStorage (`clawcontrol-storage`): theme, serverUrl, authMode, gatewayToken, sidebarCollapsed, thinkingEnabled.
