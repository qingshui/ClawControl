# ClawControl 安装使用说明文档

**版本：** v1.5.0
**最后更新：** 2026 年 3 月

---

## 目录

1. [产品简介](#产品简介)
2. [系统要求](#系统要求)
3. [下载预构建应用](#下载预构建应用)
4. [从源码安装](#从源码安装)
5. [桌面端构建指南](#桌面端构建指南)
6. [移动端构建指南](#移动端构建指南)
7. [连接配置](#连接配置)
8. [功能使用说明](#功能使用说明)
9. [常见问题](#常见问题)

---

## 产品简介

ClawControl 是一款跨平台的 OpenClaw AI 助手客户端应用，支持：

- **桌面端**：Windows、macOS、Linux（基于 Electron）
- **移动端**：iOS、Android（基于 Capacitor）

### 核心功能

| 功能类别 | 功能描述 |
|---------|---------|
| 对话交互 | 多 Agent 并发对话、流式输出、Markdown 渲染 |
| 多媒体 | 图片发送/接收、语音输入、TTS 语音播放 |
| Agent 管理 | Agent 创建/切换、Dashboard 监控、子 Agent 孵化 |
| 扩展能力 | ClawHub 技能市场、Cron 定时任务、Node 设备命令 |
| 高级功能 | 思考模式、服务配置编辑、用量监控 |

---

## 系统要求

### 桌面端开发环境

| 组件 | 要求 |
|-----|------|
| Node.js | v18 或更高版本 |
| npm | v8 或更高版本 |
| 内存 | 最低 4GB，推荐 8GB |
| 磁盘空间 | 约 2GB |

### Android 构建环境

| 组件 | 要求 |
|-----|------|
| Android Studio | Arctic Fox 或更高版本 |
| JDK | 17 或更高版本 |
| Android SDK | API 34+ |
| 内存 | 最低 8GB，推荐 16GB |

### iOS 构建环境

| 组件 | 要求 |
|-----|------|
| macOS | 13.0 或更高版本 |
| Xcode | 15.0 或更高版本 |
| Node.js | v18 或更高版本 |
| CocoaPods | 最新稳定版 |

---

## 下载预构建应用

### Windows

从 [Releases 页面](https://github.com/jakeledwards/ClawControl/releases/tag/v1.5.0) 下载：

| 文件 | 说明 | 大小 |
|-----|------|------|
| `ClawControl Setup 1.5.0.exe` | 安装版（NSIS） | ~50MB |
| `ClawControl 1.5.0.exe` | 便携版（免安装） | ~50MB |

### macOS

从 [Releases 页面](https://github.com/jakeledwards/ClawControl/releases) 下载：

| 文件 | 说明 |
|-----|------|
| `ClawControl.dmg` | 磁盘镜像安装包 |
| `ClawControl.zip` | 便携版 |

### Linux

从 [Releases 页面](https://github.com/jakeledwards/ClawControl/releases) 下载：

| 文件 | 说明 |
|-----|------|
| `ClawControl-*.AppImage` | AppImage 便携版 |
| `clawcontrol_*.amd64.deb` | Debian/Ubuntu 安装包 |

**安装 AppImage:**
```bash
chmod +x ClawControl-*.AppImage
./ClawControl-*.AppImage
```

**安装 DEB 包:**
```bash
sudo dpkg -i clawcontrol_*.amd64.deb
```

---

## 从源码安装

### 1. 克隆仓库

```bash
git clone git@github.com:jakeledwards/ClawControl.git
cd ClawControl
```

### 2. 安装依赖

```bash
npm install
```

安装完成后会自动构建 `capacitor-native-websocket` 插件。

### 3. 启动开发服务器

```bash
# 桌面端开发模式（Electron 热重载）
npm run dev

# 移动端开发模式（浏览器预览）
npm run mobile:dev
```

### 4. 代码质量检查

```bash
# TypeScript 类型检查
npm run typecheck

# ESLint 代码检查
npm run lint

# 运行测试（监听模式）
npm run test

# 运行测试（单次）
npm run test:run
```

---

## 桌面端构建指南

### Windows

```bash
npm run build:win
```

**输出文件：**
- `release/ClawControl Setup.exe` - NSIS 安装程序
- `release/ClawControl Portable.exe` - 便携版

### macOS

```bash
npm run build:mac
```

**输出文件：**
- `release/ClawControl.dmg` - 磁盘镜像
- `release/ClawControl.zip` - ZIP 压缩包

### Linux

```bash
npm run build:linux
```

**输出文件：**
- `release/ClawControl-*.AppImage` - AppImage
- `release/clawcontrol_*.amd64.deb` - Debian 包

---

## 移动端构建指南

### 前置准备

#### Android

1. 安装 Android Studio
2. 安装 JDK 17+
3. 配置环境变量：
   ```bash
   export ANDROID_HOME=~/Library/Android/sdk
   export PATH=$PATH:$ANDROID_HOME/platform-tools
   export PATH=$PATH:$ANDROID_HOME/tools/bin
   ```

#### iOS

1. 安装 Xcode
2. 安装 CocoaPods：
   ```bash
   sudo gem install cocoapods
   ```

### 构建命令

#### 通用移动 Web 构建

```bash
npm run mobile:build
```

#### Android

```bash
# 完整构建并打开 Android Studio
npm run mobile:ios

# 仅同步资源
npm run mobile:sync
```

**使用 Android Studio 构建 APK:**
1. 用 Android Studio 打开 `android/` 目录
2. 等待 Gradle 同步完成
3. 点击 `Build > Build Bundle(s) / APK(s) > Build APK(s)`
4. APK 输出位置：`android/app/build/outputs/apk/debug/app-debug.apk`

**命令行构建 APK:**
```bash
cd android
./gradlew assembleDebug
```

**安装到设备:**
```bash
# 使用 ADB 安装
adb install android/app/build/outputs/apk/debug/app-debug.apk

# 查看已连接设备
adb devices
```

#### iOS

```bash
# 完整构建并打开 Xcode
npm run mobile:ios
```

**使用 Xcode 构建:**
1. 用 Xcode 打开 `ios/App/App.xcworkspace`
2. 选择目标设备或模拟器
3. 点击 `Product > Build` 或按 `Cmd+B`
4. 运行时点击 `Product > Run` 或按 `Cmd+R`

### 生成应用图标和启动图

```bash
npm run mobile:assets
```

需要准备以下源文件：
- `resources/android/icon.png` - 1024x1024 图标
- `resources/android/splash.png` - 2732x2732 启动图

---

## 连接配置

### 服务器连接

ClawControl 需要连接 OpenClaw 服务器才能使用。

#### 1. 获取服务器地址

- **本地服务器**: `ws://localhost:8080` 或 `wss://localhost:8080`
- **局域网服务器**: `ws://192.168.x.x:8080`
- **Tailscale 服务器**: `wss://your-server.tailnet-xxx.ts.net`

#### 2. 配置连接

1. 打开应用，点击右上角 **设置图标（⚙️）**
2. 在 **Server URL** 输入 WebSocket 地址
3. 可选：设置 **Device Name**（设备名称）
4. 点击 **Save & Connect**

#### 3. 设备配对

首次连接时：

1. 应用会生成 Ed25519 设备密钥对
2. 显示配对码（Pairing Code）
3. 在 OpenClaw 服务器端批准配对请求
4. 配对成功后自动连接

### 证书错误处理

连接自签名证书服务器时可能出现证书错误：

1. 应用弹出证书错误对话框
2. 点击 **"Open URL to Accept Certificate"**
3. 在浏览器中接受证书警告
4. 关闭浏览器标签页
5. 在应用中重试连接

---

## 功能使用说明

### 聊天界面

| 功能 | 操作方式 |
|-----|---------|
| 发送消息 | 输入文字后按 Enter 或点击发送按钮 |
| 发送图片 | 点击回形针图标选择图片 |
| 语音输入 | 点击麦克风图标 |
| 思考模式 | 点击灯泡图标开启/关闭 |
| 停止输出 | 点击停止按钮中断流式输出 |

### 会话管理

| 功能 | 操作方式 |
|-----|---------|
| 新建会话 | 点击侧边栏 "+" 按钮 |
| 切换会话 | 点击侧边栏会话项 |
| 置顶会话 | 右键会话 > "Pin" |
| 删除会话 | 右键会话 > "Delete" 或左滑（移动端） |
| 重命名会话 | 右键会话 > "Rename" |

### Agent 管理

1. 点击右上角 Agent 选择器
2. 可选择已有 Agent 或创建新 Agent
3. 在 Agent 详情页面可查看：
   - 配置文件
   - 工作空间文件
   - 运行状态

### 子 Agent 孵化

当主 Agent 需要并行执行任务时：

1. Agent 会自动创建子 Agent
2. 子 Agent 状态显示为内联块
3. 点击可打开独立窗口查看子 Agent 对话

### 技能市场（ClawHub）

1. 打开右侧面板 > Skills 标签
2. 搜索或浏览可用技能
3. 查看技能详情和安全评分
4. 点击 "Install" 一键安装

### Cron 定时任务

1. 打开右侧面板 > Crons 标签
2. 查看现有定时任务列表
3. 点击 "+" 创建新任务
4. 可手动运行、暂停、删除任务

### 服务器配置

1. 点击设置图标 > "OpenClaw Server Settings"
2. 配置三个标签页：
   - **Agent Defaults**: 模型、思考模式、限制等
   - **Tools & Memory**: 工具配置、内存后端
   - **Channels**: 各渠道开关
3. 修改后点击 "Save"，服务器自动重启

### 用量监控

1. 点击设置 > "Usage"
2. 查看：
   - 每日成本统计
   - Token 使用量图表
   - 活跃度热力图
   - 服务器资源限制

---

## 常见问题

### Q1: 连接服务器失败

**可能原因：**
- 服务器未启动
- 防火墙阻止连接
- WebSocket 地址错误

**解决方法：**
1. 确认 OpenClaw 服务器正在运行
2. 检查服务器日志
3. 尝试使用 `ws://` 或 `wss://` 前缀
4. 确认服务器端口在防火墙中开放

### Q2: 移动端无法连接服务器

**Android 特有：**
- 确保服务器地址可被移动设备访问
- 如使用 `localhost`，需改为电脑 IP 地址
- 检查设备与服务器在同一网络

**iOS 特有：**
- 检查 ATS（App Transport Security）设置
- 使用 HTTPS/WSS 加密连接

### Q3: 构建 Android APK 失败

**常见错误：Java 版本不匹配**

```
错误：无效的源发行版：21
```

**解决方法：**
修改以下文件的 Java 版本为 17：
- `node_modules/@capacitor/android/capacitor/build.gradle`
- `node_modules/@capacitor/*/android/build.gradle`
- `android/app/capacitor.build.gradle`
- `android/capacitor-cordova-android-plugins/build.gradle`

然后执行：
```bash
cd android
./gradlew clean
./gradlew assembleDebug
```

### Q4: iOS 构建时 CocoaPods 依赖错误

**解决方法：**
```bash
cd ios/App
pod deintegrate
pod install
```

### Q5: 语音输入不工作

**检查项：**
1. 浏览器/系统已授予麦克风权限
2. Android 需在 `AndroidManifest.xml` 添加录音权限
3. iOS 需在 `Info.plist` 添加：
   ```xml
   <key>NSSpeechRecognitionUsageDescription</key>
   <string>ClawControl uses speech recognition for voice input.</string>
   <key>NSMicrophoneUsageDescription</key>
   <string>ClawControl needs microphone access for voice input.</string>
   ```

### Q6: 图片无法发送

**检查项：**
1. 确认服务器支持图片上传
2. 检查图片格式（支持 PNG、JPG、GIF、WebP）
3. 确认文件大小未超限

### Q7: 应用在后台断开连接

**Android 解决方案：**
应用在后台时 WebSocket 可能被系统关闭。已在 v1.5.0 中添加前台服务保持连接。

如需进一步优化，可修改 `android/app/src/main/AndroidManifest.xml` 添加电池优化白名单。

---

## 技术支持

- **GitHub Issues**: [提交问题](https://github.com/jakeledwards/ClawControl/issues)
- **Releases**: [下载页面](https://github.com/jakeledwards/ClawControl/releases)
- **文档**: `/docs` 目录

---

## 附录：命令速查表

### 开发命令

```bash
npm run dev           # 桌面端开发模式
npm run mobile:dev    # 移动端开发模式（浏览器）
npm run typecheck     # TypeScript 类型检查
npm run lint          # ESLint 检查
npm run test          # 运行测试（监听模式）
npm run test:run      # 运行测试（单次）
```

### 构建命令

```bash
npm run build:win     # 构建 Windows 版
npm run build:mac     # 构建 macOS 版
npm run build:linux   # 构建 Linux 版
npm run mobile:build  # 构建移动端 Web 资源
npm run mobile:sync   # 同步资源到原生项目
npm run mobile:ios    # 构建并打开 Xcode
npm run mobile:android# 构建并打开 Android Studio
```

### 测试命令

```bash
npm run e2e           # 运行端到端测试
npm run e2e:ui        # 运行测试（UI 模式）
npm run test:coverage # 运行测试（覆盖率报告）
```

---

**文档结束**
