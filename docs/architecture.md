# ClawControl 架构设计文档

## 一、项目概述

**ClawControl** 是一个跨平台的 OpenClaw AI 助手客户端，支持：
- **桌面端**：Electron (Windows/macOS/Linux)
- **移动端**：Capacitor (iOS/Android)
- **Web 浏览器**：直接访问

技术栈：React 18 + TypeScript + Zustand + Vite + Electron + Capacitor

---

## 二、目录结构

```
ClawControl/
├── electron/                    # Electron 主进程
│   ├── main.ts                 # 主进程入口，窗口创建，IPC
│   └── preload.ts              # 预加载脚本，桥接主进程和渲染进程
│
├── src/                        # React 渲染进程源码
│   ├── components/             # React 组件 (29 个)
│   │   ├── AgentDetailView.tsx
│   │   ├── ChatArea.tsx
│   │   ├── InputArea.tsx
│   │   ├── Sidebar.tsx
│   │   ├── SettingsModal.tsx
│   │   ├── ServerSettingsView.tsx
│   │   ├── SkillDetailView.tsx
│   │   ├── CronJobDetailView.tsx
│   │   ├── NodesView.tsx
│   │   ├── UsageView.tsx
│   │   └── ...
│   ├── hooks/                  # 自定义 React Hooks
│   │   ├── useSwipeGesture.ts
│   │   └── useLongPress.ts
│   ├── lib/                    # 核心库模块
│   │   ├── openclaw/          # OpenClaw 客户端模块
│   │   │   ├── client.ts      # WebSocket 连接核心
│   │   │   ├── types.ts       # 协议类型定义
│   │   │   ├── chat.ts        # 聊天 RPC 方法
│   │   │   ├── sessions.ts    # 会话管理
│   │   │   ├── agents.ts      # Agent 管理
│   │   │   ├── skills.ts      # 技能管理
│   │   │   ├── cron-jobs.ts   # 定时任务
│   │   │   ├── config.ts      # 配置管理
│   │   │   ├── utils.ts       # 工具函数
│   │   │   └── index.ts       # 公共导出
│   │   ├── node/              # Node 模式设备命令模块
│   │   ├── platform.ts        # 平台抽象层
│   │   ├── clawhub.ts         # ClawHub 技能市场
│   │   └── device-identity.ts # Ed25519 设备认证
│   ├── store/                  # Zustand 状态管理
│   │   └── index.ts           # 全局状态中心
│   ├── styles/                 # 全局样式
│   ├── utils/                  # 通用工具
│   ├── App.tsx                 # 应用根组件
│   └── main.tsx                # 应用入口
│
├── android/                    # Android 原生项目 (Capacitor)
├── ios/                        # iOS 原生项目 (Capacitor)
├── plugins/                    # Capacitor 原生插件
│   └── capacitor-native-websocket/
│
├── e2e/                        # Playwright 端到端测试
│   ├── tests/                  # E2E 测试用例
│   ├── mock-server/            # 模拟 OpenClaw 服务器
│   └── playwright.config.ts    # Playwright 配置
├── scripts/                    # 构建脚本
├── docs/                       # 文档
├── build/                      # 构建资源 (图标等)
├── package.json                # 项目配置
├── vite.config.ts              # Vite 配置 (桌面端)
├── vite.config.mobile.ts       # Vite 配置 (移动端)
├── capacitor.config.ts         # Capacitor 配置
└── tsconfig.json               # TypeScript 配置
```

---

## 三、核心架构

### 1. 三层架构

```
┌─────────────────────────────────────────────────────────┐
│  渲染进程 (React + TypeScript)                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Components (UI 层)                              │   │
│  │  └── 使用 useStore() 消费状态                    │   │
│  ├─────────────────────────────────────────────────┤   │
│  │  Zustand Store (状态管理层)                      │   │
│  │  - 持久化到 localStorage                        │   │
│  │  - 事件驱动更新                                  │   │
│  ├─────────────────────────────────────────────────┤   │
│  │  OpenClawClient (通信层)                         │   │
│  │  - WebSocket JSON-RPC 协议 (v3)                 │   │
│  │  - 实时消息流式传输                              │   │
│  │  - 每会话流隔离                                  │   │
│  └─────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────┤
│  平台抽象层 (Platform Layer)                            │
│  - Token 存储 | 外部链接 | 通知 | WebSocket 工厂        │
├─────────────────────────────────────────────────────────┤
│  Electron 主进程 / Capacitor 原生层                      │
│  - 窗口管理 | IPC | 原生 API                             │
└─────────────────────────────────────────────────────────┘
```

### 2. 数据流

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  用户操作   │ ──→ │  React 组件 │ ──→ │Zustand Action│
└─────────────┘     └─────────────┘     └─────────────┘
                                              │
                                              ↓
┌─────────────────────────────────────────────────────────┐
│              OpenClawClient → WebSocket                 │
│                    ↓                                    │
│              OpenClaw 服务器                             │
│                    ↓                                    │
│              WebSocket 事件                              │
└─────────────────────────────────────────────────────────┘
         ↓                ↓                ↓
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│客户端事件处理│ →│Zustand 状态  │ →│  React 渲染  │
└─────────────┘  └─────────────┘  └─────────────┘
                                          │
                                          ↓
                                    ┌─────────────┐
                                    │  用户界面更新 │
                                    └─────────────┘
```

---

## 四、核心模块详解

### 1. OpenClaw 客户端模块 (`src/lib/openclaw/`)

| 文件 | 大小 | 功能 |
|------|------|------|
| `client.ts` | 48KB | WebSocket 连接、事件路由、每会话流状态管理 |
| `types.ts` | 5KB | 协议帧类型、领域接口 (Message, Session, Agent 等) |
| `chat.ts` | 13KB | `chat.send`, `chat.history`, `chat.abort` RPC 方法 |
| `sessions.ts` | 4KB | 会话 CRUD 和 `sessions.spawn` |
| `agents.ts` | 9KB | Agent 列表、身份、文件管理 |
| `skills.ts` | 2KB | 技能列表、切换、安装 |
| `cron-jobs.ts` | 3KB | 定时任务管理 |
| `config.ts` | <1KB | 服务器配置读写 (`config.get`, `config.patch`) |
| `utils.ts` | 18KB | ANSI stripping、内容提取、心跳检测、媒体解析 |

**协议帧类型**：
- `req`: 出站请求 (`method`, `params`)
- `res`: 响应 (`ok` 布尔值，`payload`/`error`)
- `event`: 服务器推送事件 (`chat`, `agent`, `presence`, `connect.challenge`)

**核心 RPC 方法**：
```typescript
// 会话
sessions.list, sessions.spawn, sessions.patch, sessions.delete

// 聊天
chat.send, chat.history, chat.abort

// Agent
agents.list, agent.identity.get, agents.files.list,
agents.files.get, agents.files.set

// 配置
config.get, config.patch

// 技能
skills.status, skills.update, skills.install

// 定时任务
cron.list, cron.get, cron.update
```

### 2. 流式传输架构

**每会话流隔离** (`Map<string, SessionStreamState>`)：

```typescript
interface SessionStreamState {
  source: 'chat' | 'agent' | null    // 流来源
  text: string                        // 累积文本
  mode: 'delta' | 'cumulative' | null // 传输模式
  blockOffset: number                 // 内容块偏移
  started: boolean                    // 是否已开始
  runId: string | null                // 运行 ID
  mediaLines: string[]                // 媒体文件路径
}
```

**关键概念**：

| 概念 | 说明 |
|------|------|
| **流源仲裁** | 第一个到达的事件类型 (`chat` 或 `agent`) 占用会话，另一个被忽略 |
| **累积文本合并** | 服务器发送累积的 `data.text`，客户端检测回退并用 `\n\n` 分隔累积 |
| **父会话追踪** | `parentSessionKeys: Set<string>` 追踪用户发送过消息的会话 |
| **子代理检测** | 来自未知会话的事件触发子代理检测 |
| **会话键解析** | 无 `sessionKey` 的事件回退到 `defaultSessionKey` (最近发送目标) |

**服务器事件类型**：

| 事件 | 说明 |
|------|------|
| `chat { state: "delta" }` | 累积文本块 (`delta` 或 `message.content`) |
| `chat { state: "final" }` | 完整消息 (`message` 对象) |
| `agent { stream: "assistant" }` | 文本输出 (`data.text` 累积 或 `data.delta`) |
| `agent { stream: "tool" }` | 工具调用开始/结果 (`data.name`, `data.phase`, `data.result`) |
| `agent { stream: "lifecycle" }` | Agent 生命周期 (`data.state: "complete"` 表示流结束) |
| `presence` | Agent 在线/离线状态变化 |

### 3. Zustand Store (`src/store/index.ts`)

**核心状态**：

| 类别 | 状态 |
|------|------|
| **连接** | `connected`, `connecting`, `connectionError`, `client`, `pairingStatus` |
| **会话** | `sessions`, `currentSessionId`, `messages`, `pinnedSessionKeys` |
| **流状态** | `streamingSessions`, `sessionHadChunks`, `sessionToolCalls`, `streamingThinking` |
| **配置** | `theme`, `serverUrl`, `authMode`, `gatewayToken`, `deviceName` |
| **Profiles** | `serverProfiles[]`, `activeProfileId` |
| **功能** | `skills`, `cronJobs`, `hooks`, `agents`, `nodes` |

**事件驱动更新**：

| 客户端事件 | Store 效果 |
|-----------|-----------|
| `connected` | `connected=true`，清除配对状态 |
| `disconnected` | `connected=false`，清除流状态 |
| `streamStart` | 标记会话为流式传输，启动子代理轮询 |
| `streamChunk` | 追加文本到流式消息 |
| `streamEnd` | 清除流状态，通知用户，停止轮询 |
| `message` | 用最终消息替换流式占位符 |
| `toolCall` | 添加/更新会话中的工具调用 |
| `thinkingChunk` | 累积会话的思考文本 |
| `compaction` | 设置/清除压缩指示器 |
| `subagentDetected` | 添加到 `activeSubagents` 列表 |
| `pairingRequired` | 显示配对 UI |
| `certError` | 显示证书错误模态框 |
| `execApprovalRequested` | 显示执行批准通知 |
| `agentStatus` | 更新 Agent 在线/离线状态 |

**状态持久化**：
```typescript
// 持久化到 localStorage ('clawcontrol-storage')
persistedKeys: [
  'theme', 'serverUrl', 'authMode', 'gatewayToken',
  'sidebarCollapsed', 'thinkingEnabled',
  'sidebarOpen', 'rightPanelOpen', 'rightPanelTab',
  'nodeEnabled', 'nodePermissions'
]
```

### 4. 平台抽象层 (`src/lib/platform.ts`)

统一 API 跨所有平台：

| 功能 | Electron | Capacitor (iOS/Android) | Web |
|------|----------|------------------------|-----|
| **Token 存储** | safeStorage (加密) | Preferences 插件 | localStorage |
| **外部链接** | shell.openExternal | Browser 插件 | window.open |
| **通知** | Notification API | LocalNotifications | Notification API |
| **WebSocket** | 浏览器 WebSocket | NativeWebSocket (iOS) | 浏览器 WebSocket |
| **证书信任** | IPC trustHost | clearTLSFingerprint | N/A |
| **ClawHub 安装** | ZIP 下载 + 解压 | N/A | N/A |
| **Ed25519** | Node.js crypto | Web Crypto API | Web Crypto API |
| **触觉反馈** | N/A | Haptics 插件 | N/A |
| **状态栏** | N/A | StatusBar 插件 | N/A |
| **键盘处理** | N/A | Keyboard 插件 | N/A |

---

## 五、认证流程 (Ed25519 设备身份配对)

```
┌─────────────┐                              ┌─────────────┐
│   客户端    │                              │   服务器    │
└──────┬──────┘                              └──────┬──────┘
       │                                            │
       │  1. WebSocket 连接                          │
       │ ─────────────────────────────────────────> │
       │                                            │
       │  2. connect.challenge (nonce)              │
       │ <───────────────────────────────────────── │
       │                                            │
       │  3. 握手请求                                │
       │     - 有身份：deviceId, signature, pubkey  │
       │     - 无身份：token/password, mode         │
       │ ─────────────────────────────────────────> │
       │                                            │
       │  4. hello-ok (含可选 deviceToken)          │
       │ <───────────────────────────────────────── │
       │                                            │
       │  5. 存储 deviceToken 用于重连               │
       │                                            │
       │  6. 如 NOT_PAIRED: UI 显示配对说明          │
       │  7. 如 DEVICE_IDENTITY_STALE: 清除并重试    │
       │                                            │
```

**设备身份存储**：
- 使用 Ed25519 密钥对进行挑战签名
- 设备令牌存储在安全存储中（Electron: safeStorage, Mobile: Preferences, Web: localStorage）

---

## 六、组件布局

```
App
├── Sidebar                 # 会话列表，可折叠，支持固定会话
├── main-content
│   ├── TopBar              # Agent 选择器、主题切换、设置按钮
│   ├── ChatArea            # 消息显示 (Markdown + 代码高亮)
│   ├── InputArea           # 消息输入 (思考模式、语音输入、图片附件)
│   ├── SkillDetailView     # 单个技能详情
│   ├── CronJobDetailView   # 定时任务编辑器
│   ├── CreateCronJobView   # 新建定时任务
│   ├── AgentDetailView     # Agent 配置编辑器
│   ├── CreateAgentView     # 新建 Agent
│   ├── ClawHubSkillDetailView # ClawHub 技能浏览器
│   ├── HookDetailView      # Hook 配置
│   ├── ServerSettingsView  # 服务器配置编辑器
│   ├── ServerProfileTabs   # 多服务器配置切换
│   ├── UsageView           # 使用统计仪表板
│   ├── NodesView           # 节点设备管理
│   └── AgentDashboard      # Agent 活动实时网格
├── RightPanel              # Skills/Crons 标签页
├── CanvasPanel             # Canvas 画板 (右侧悬浮)
└── Modals
    ├── SettingsModal       # 设置模态框
    ├── CertErrorModal      # 证书错误模态框
    └── NodePermissionsDialog # 节点权限对话框
```

### 主视图路由 (`mainView` 状态)

| `mainView` 值 | 组件 | 说明 |
|--------------|------|------|
| `chat` | ChatArea + InputArea | 默认聊天界面 |
| `skill-detail` | SkillDetailView | 技能检查器 |
| `cron-detail` | CronJobDetailView | 定时任务编辑器 |
| `create-cron` | CreateCronJobView | 新建定时任务表单 |
| `agent-detail` | AgentDetailView | Agent 配置编辑器 |
| `create-agent` | CreateAgentView | 新建 Agent 表单 |
| `clawhub-skill-detail` | ClawHubSkillDetailView | ClawHub 技能浏览器 |
| `hook-detail` | HookDetailView | Hook 配置 |
| `server-settings` | ServerSettingsView | 服务器配置编辑器 |
| `usage` | UsageView | 使用统计仪表板 |
| `nodes` | NodesView | 节点设备管理 |
| `pixel-dashboard` | AgentDashboard | Agent 活动实时网格 |

---

## 七、构建系统

### Vite 配置

| 配置 | 用途 |
|------|------|
| `vite.config.ts` | 桌面端构建 (含 Electron 插件) |
| `vite.config.mobile.ts` | 移动端构建 (无 Electron 插件) |

### 打包命令

```bash
# 桌面端开发
npm run dev           # 启动开发服务器 (热重载)

# 桌面端打包
npm run build:win     # Windows (NSIS 安装版 + 便携版)
npm run build:mac     # macOS (DMG + ZIP, Universal)
npm run build:linux   # Linux (AppImage + deb)

# 移动端开发
npm run mobile:dev    # 移动开发服务器 (浏览器预览)

# 移动端打包
npm run mobile:build    # 构建 Web 资源
npm run mobile:sync     # 构建并同步到原生项目
npm run mobile:ios      # 构建、同步并打开 Xcode
npm run mobile:android  # 构建、同步并打开 Android Studio
```

### Electron Builder 配置

```json
{
  "appId": "com.claw.control",
  "productName": "ClawControl",
  "win": {
    "target": ["nsis", "portable"],
    "icon": "build/icon.png"
  },
  "mac": {
    "target": [
      {"target": "dmg", "arch": ["universal"]},
      {"target": "zip", "arch": ["universal"]}
    ],
    "category": "public.app-category.productivity"
  },
  "linux": {
    "target": ["AppImage", "deb"],
    "category": "Utility"
  }
}
```

---

## 八、测试架构

| 测试类型 | 位置 | 工具 | 环境 |
|---------|------|------|------|
| **单元测试** | `src/**/*.test.ts` | Vitest | JSDOM |
| **E2E 测试** | `e2e/tests/*.spec.ts` | Playwright | 模拟 WebSocket 服务器 |
| **测试设置** | `src/test/setup.ts` | - | - |
| **E2E 配置** | `e2e/playwright.config.ts` | - | - |
| **模拟服务器** | `e2e/mock-server/` | - | OpenClaw v3 模拟 |

### 运行测试

```bash
# 单元测试
npm run test           # 监听模式
npm run test:run       # 运行一次
npm run test:coverage  # 带覆盖率

# E2E 测试
npm run e2e            # 无头模式
npm run e2e:ui         # UI 模式
npm run e2e:headed     # 有头模式

# 运行单个测试
npx vitest src/lib/openclaw-client.test.ts
npx playwright test e2e/tests/chat.spec.ts
```

---

## 九、模块级状态 (Zustand 外部)

某些状态出于性能或生命周期考虑放在 Zustand 外部：

| 变量 | 类型 | 用途 |
|------|------|------|
| `_subagentPollTimer` | `IntervalID` | 子代理轮询定时器 ID |
| `_baselineSessionKeys` | `Set<string>` | 子代理检测的会话键快照 |
| `_sessionLoadVersion` | `number` | 检测异步消息加载过期的计数器 |
| `_sessionMessagesCache` | `Map<string, Message[]>` | 会话切换缓存 |
| `_clawHubStatsCache` | `object` | ClawHub 下载/收藏数缓存 |

---

## 十、核心特性

| 特性 | 说明 |
|------|------|
| **并发代理流式传输** | 每会话流隔离，支持多代理并发对话 |
| **聊天界面** | 流式传输、Markdown 渲染、代码块复制 |
| **图片发送/接收** | 内联预览、画廊显示 (PNG/JPG/GIF/WebP) |
| **语音输入** | WebSpeech API (浏览器) 或原生语音识别 (移动端) |
| **唤醒词检测** | 持续语音监控，可配置触发短语 |
| **思考模式** | 切换扩展思考，显示推理过程 |
| **Agent 选择** | 切换不同 AI 代理，每会话代理身份 |
| **Agent 管理** | 创建/重命名/删除/浏览 Agent 配置和工作区文件 |
| **Agent 仪表板** | 实时活动网格，显示所有代理状态 |
| **会话管理** | 创建/查看/管理聊天会话，消息缓存，未读指示器 |
| **固定会话** | 将会话固定到侧边栏顶部，快速访问 |
| **子代理生成** | 生成隔离的子代理会话，内联状态块，弹出窗口 |
| **ClawHub 技能浏览器** | 搜索/浏览技能，VirusTotal 安全扫描徽章，一键安装 |
| **工具调用卡片** | 内联显示工具调用，每工具图标，详情文本，弹出查看器 |
| **停止按钮** | 随时中止进行中的聊天流 |
| **服务器设置** | 全页面编辑器，代理默认值、工具、内存、频道设置 |
| **使用视图** | 监控服务器限制、资源、使用成本估算 |
| **设备配对** | Ed25519 设备身份，配对码显示，复制/分享按钮 |
| **定时任务** | 查看/创建/手动运行/删除定时任务，实时状态更新 |
| **深色/浅色主题** | 完整主题支持，系统偏好检测 |
| **移动手势** | 滑动删除会话，长按上下文菜单 |
| **Node 模式** | 并行 WebSocket 连接，用于代理调用设备命令，细粒度权限 |
| **自动重试连接** | WebSocket 健康检查，半开连接检测 |
| **多平台** | Windows/macOS/Linux、iOS/Android |

---

## 十一、依赖项

### 生产依赖

| 包 | 用途 |
|-----|------|
| `@capacitor/*` | Capacitor 原生插件 |
| `capacitor-native-websocket` | 原生 WebSocket (iOS TLS 处理) |
| `react` / `react-dom` | UI 框架 |
| `zustand` | 状态管理 |
| `marked` | Markdown 解析 |
| `dompurify` / `rehype-sanitize` | XSS 防护 |
| `react-markdown` | React Markdown 渲染 |
| `date-fns` | 日期格式化 |
| `recharts` | 使用统计图表 |

### 开发依赖

| 包 | 用途 |
|-----|------|
| `electron` / `electron-builder` | 桌面应用打包 |
| `vite` / `vite-plugin-electron` | 构建工具 |
| `typescript` | 类型检查 |
| `vitest` / `jsdom` | 单元测试 |
| `@playwright/test` | E2E 测试 |
| `eslint` | 代码规范 |

---

## 十二、版本历史

### v1.5.0 (最新)

**主要特性**
- Node 模式 — 用于代理调用设备命令的并行 WebSocket 连接
- Node 权限对话框 — 细粒度控制设备命令访问
- 多连接 WebSocket 池，增强并行通信
- Playwright E2E 测试套件

**音频与媒体**
- TTS 音频播放修复
- Base64 数据 URL 支持
- 过滤流式传输中的 Base64 图像数据

**Android**
- 后台服务保持 Node 模式 WebSocket 连接
- 修复滑动输入延迟、键盘 STT 冲突

---

*文档更新时间：2026-03-15*
