# 设备未配对处理指南

当 ClawControl 显示 **"Device Pairing Required"** 或 **"NOT_PAIRED"** 错误时，按照以下步骤解决。

---

## 为什么需要设备配对？

ClawControl 使用 **Ed25519 设备身份认证**来保护 OpenClaw 服务器：

1. **首次连接**: 客户端生成密钥对，发送配对请求
2. **服务器批准**: 管理员在服务器端批准设备
3. **后续连接**: 使用已批准的凭证自动认证

这防止未经授权的设备访问你的 AI 助手。

---

## 快速解决步骤

### 步骤 1: 获取配对码

在 ClawControl 应用中：

1. 打开 **设置 (⚙️)**
2. 输入服务器 URL 并连接
3. 看到 "Device Pairing Required" 提示
4. 复制显示的命令：
   ```bash
   openclaw devices approve <device-id>
   ```

### 步骤 2: 在服务器批准

SSH 登录到 OpenClaw 服务器：

```bash
# SSH 到服务器
ssh user@your-server-ip

# 执行批准命令
openclaw devices approve <device-id>
```

### 步骤 3: 重试连接

回到 ClawControl 应用，点击 **"Retry Connection"** 或重新保存设置。

---

## 详细解决方法

### 方法 A: 命令行批准（推荐）

**1. 查看待批准设备列表**
```bash
openclaw devices pair list
```

示例输出：
```
Pending devices:
  - ID: dev_abc123, Name: ClawControl-Desktop, Requested: 2026-03-14 10:30:00
  - ID: dev_xyz789, Name: ClawControl-Mobile, Requested: 2026-03-14 11:15:00
```

**2. 批准设备**
```bash
openclaw devices approve dev_abc123
```

**3. 验证批准成功**
```bash
openclaw devices pair list
# 应显示 "No pending devices" 或列表中没有该设备
```

---

### 方法 B: Web 界面批准

**1. 打开管理页面**

在应用提示中点击 "Open this link"，或手动访问：
```
http://your-server-ip:8080/nodes
或
https://your-server-ip:8080/nodes
```

**2. 登录管理界面**

使用你的 OpenClaw 管理员账号登录。

**3. 批准设备**

1. 找到 "Pending Devices" 部分
2. 找到设备名称 "ClawControl-XXX"
3. 点击 "Approve" 按钮

---

### 方法 C: 查看服务器日志

如果以上方法不起作用，检查日志获取详细信息：

```bash
# 实时查看日志
openclaw logs -f

# 查看最近 50 条日志
openclaw logs --tail 50

# 搜索配对相关日志
openclaw logs | grep -i pair
```

---

## 故障排查

### 问题 1: 批准后立即显示 "连接成功"

**状态**: ✅ 正常

批准设备后，应用应自动重连并显示成功。

---

### 问题 2: 仍然显示 "NOT_PAIRED"

**可能原因**:
- 设备 ID 复制错误
- 批准命令未实际执行
- 客户端缓存了旧状态

**解决方法**:

```bash
# 1. 确认设备已批准
openclaw devices pair list

# 2. 查看已批准设备
openclaw devices list

# 3. 撤销并重新批准
openclaw device token revoke <device-id>
openclaw devices approve <device-id>
```

在客户端：
- 桌面：刷新页面或重启应用
- 移动：关闭应用后台进程，重新打开

---

### 问题 3: "Signature invalid" 错误

**原因**: 设备密钥与服务器记录不匹配

**解决方法**:

**服务器端：**
```bash
# 列出所有设备
openclaw devices list

# 撤销旧设备
openclaw device token revoke <device-id>
```

**客户端：**
1. 打开浏览器开发者工具（F12）
2. Application > Storage > Clear site data
3. 或卸载重装移动应用

**重新连接：**
- 在设置中重新保存服务器 URL
- 会生成新的密钥对并完成配对

---

### 问题 4: 没有显示配对码

**可能原因**:
- 服务器配置禁用了设备配对
- 使用了 loopback 地址（localhost）不需要配对

**检查服务器配置**:
```bash
openclaw config get gateway.devicePairing
```

如果显示 `false`，启用它：
```bash
openclaw config set gateway.devicePairing true
openclaw restart
```

**使用 localhost 的情况**:
- `ws://localhost:8080` 自动跳过配对
- 使用实际 IP 地址才需要配对

---

### 问题 5: 移动设备配对困难

**Android/iOS 真机测试**:

1. **确保同一网络**: 手机和服务器在同一 WiFi
2. **使用正确 IP**: 用服务器实际 IP，不是 localhost
3. **检查防火墙**: 服务器开放 8080 端口

```bash
# 服务器防火墙检查
sudo ufw status
sudo ufw allow 8080/tcp
```

**分享配对命令到手机**:
- 在设置模组的配对提示中，点击分享按钮
- 通过微信/短信发送配对命令到电脑
- 在电脑执行批准命令

---

## 开发环境配置

### 临时禁用配对（仅限开发）

在开发环境可以快速测试，无需每次配对：

```bash
# 查看当前配对设置
openclaw config get gateway.devicePairing

# 禁用配对（开发环境！）
openclaw config set gateway.devicePairing false

# 重启服务器
openclaw restart
```

⚠️ **警告**:
- 仅在内网/开发环境使用
- 生产环境必须保持配对开启
- 禁用后任何设备都可以连接服务器

### 配置允许的 Origin

如果连接时显示 "Origin not allowed":

```bash
# 添加允许的 Origin
openclaw config set gateway.controlUi.allowedOrigins '["http://localhost:5173","http://localhost:5174"]'

# 重启服务器
openclaw restart
```

---

## 多设备管理

### 查看所有已批准设备

```bash
openclaw devices list
```

示例输出：
```
Approved devices:
  - ID: dev_001, Name: ClawControl-Desktop, Last seen: 2026-03-14 12:00:00
  - ID: dev_002, Name: ClawControl-Mobile, Last seen: 2026-03-14 11:30:00
  - ID: dev_003, Name: MacBook-Pro, Last seen: 2026-03-13 18:45:00
```

### 撤销设备访问

```bash
# 撤销特定设备
openclaw device token revoke dev_001

# 撤销所有设备（紧急情况）
openclaw device token revoke --all
```

### 设备命名

在 ClawControl 设置中设置友好的设备名称：
1. 打开设置
2. 在 "Device Name" 输入名称
3. 保存后重新连接

---

## 安全最佳实践

### ✅ 推荐做法

1. **定期审查设备列表**
   ```bash
   # 每周检查
   openclaw devices list
   ```

2. **及时撤销离职人员设备**
   ```bash
   openclaw device token revoke <device-id>
   ```

3. **使用描述性设备名称**
   - "Alice-MacBook-Pro" 优于 "ClawControl"
   - "Office-iPad" 优于 "Mobile-Device"

4. **启用日志审计**
   ```bash
   openclaw logs | grep "device" >> /var/log/openclaw-devices.log
   ```

### ❌ 避免做法

1. **不要**在生产环境禁用设备配对
2. **不要**分享批准命令给未授权人员
3. **不要**使用相同设备凭证在多个设备
4. **不要**忽略未知设备的批准请求

---

## 附录：配对流程技术说明

### 配对消息流

```
客户端                          服务器
  |                               |
  |-------- WebSocket ---------->|
  |                               |
  |<---- connect.challenge ------|
  |         (nonce)               |
  |                               |
  |------ connect (签名) -------->|
  |         (device info)         |
  |                               |
  |<---- NOT_PAIRED -------------|
  |         (拒绝)                |
  |                               |
  |    [管理员执行批准命令]        |
  |                               |
  |-------- 重试连接 ------------>|
  |                               |
  |<---- hello-ok ---------------|
  |         (deviceToken)         |
  |                               |
  |==== 已认证，正常通信 =========|
```

### 设备身份存储位置

| 平台 | 存储位置 |
|------|---------|
| Electron 桌面 | safeStorage（加密） |
| iOS | Keychain |
| Android | Encrypted SharedPreferences |
| 浏览器 | localStorage（迁移到安全存储） |

### 相关配置文件

- **服务器配置**: `~/.openclaw/config.json`
- **设备密钥**: `~/.openclaw/devices.json`
- **客户端凭证**: 平台特定安全存储

---

## 获取帮助

如果问题仍未解决：

1. **收集以下信息**:
   - 服务器 OS 和 OpenClaw 版本
   - 客户端平台（桌面/移动/浏览器）
   - 完整的错误信息截图
   - 服务器日志（最近 50 行）

2. **联系支持**:
   - GitHub Issues: https://github.com/jakeledwards/ClawControl/issues
   - OpenClaw 文档：https://docs.openclaw.ai

---

**文档版本**: 1.0
**最后更新**: 2026-03-14
