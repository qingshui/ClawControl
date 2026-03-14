# OpenClaw Gateway 连接问题诊断指南

## 快速诊断步骤

### 步骤 1: 确认服务器地址

在应用设置中检查 Server URL：

```
正确格式示例:
- 本地开发：ws://localhost:8080
- 局域网 IP: ws://192.168.1.100:8080
- Tailscale: wss://your-server.tailnet-xxx.ts.net
```

**注意**: URL 必须以 `ws://` 或 `wss://` 开头

### 步骤 2: 测试服务器可达性

```bash
# 测试 WebSocket 端口是否开放
# macOS/Linux:
nc -zv your-server-ip 8080

# Windows PowerShell:
Test-NetConnection -ComputerName your-server-ip -Port 8080

# 测试 HTTPS 端点（用于证书验证）
curl -k https://your-server-ip:8080
```

### 步骤 3: 检查 OpenClaw 服务器状态

```bash
# 查看服务器是否运行
ps aux | grep openclaw

# 查看服务器日志
openclaw logs

# 重启服务器
openclaw restart
```

### 步骤 4: 检查设备配对状态

首次连接时需要设备配对：

1. 打开应用，输入服务器 URL
2. 点击 "Save & Connect"
3. 如果显示配对码，在服务器端批准：
   ```bash
   openclaw device pair approve < pairing-code
   ```

### 步骤 5: 查看应用日志

在浏览器控制台（开发模式）或应用日志中查看错误信息：

**常见错误代码：**

| 错误 | 含义 | 解决方案 |
|-----|------|---------|
| `NOT_PAIRED` | 设备未配对 | 在服务器端批准配对请求 |
| `DEVICE_IDENTITY_STALE` | 设备密钥过期 | 清除设备身份后重试 |
| `Connection timed out` | 服务器不可达 | 检查服务器是否运行、防火墙设置 |
| `WebSocket connection failed` | 连接失败 | 检查 URL 格式、端口是否开放 |
| `Signature invalid` | 签名无效 | 清除设备身份重新配对 |

---

## 网络配置检查清单

### 本地服务器 (localhost)

- [ ] 服务器正在运行
- [ ] 端口 8080 未被防火墙阻止
- [ ] 使用 `ws://localhost:8080` 或 `wss://localhost:8080`

### 局域网服务器

- [ ] 服务器和客户端在同一网络
- [ ] 服务器防火墙允许入站连接
- [ ] 使用服务器的实际 IP 地址（如 `192.168.1.100`）
- [ ] 路由器未隔离客户端（AP 隔离）

**配置服务器防火墙 (UFW - Ubuntu/Debian):**
```bash
sudo ufw allow 8080/tcp
sudo ufw status
```

**配置服务器防火墙 (pfctl - macOS):**
```bash
sudo pfctl -f /etc/pf.conf
```

### Tailscale 服务器

- [ ] 客户端已连接 Tailscale
- [ ] 服务器在线 (`tailscale status`)
- [ ] 使用 Tailscale IP 或 MagicDNS 名称
- [ ] 防火墙允许 Tailscale 流量

```bash
# 获取 Tailscale IP
tailscale ip

# 测试连通性
ping <tailscale-ip>
```

---

## 证书问题处理

### 自签名证书错误

连接使用 `wss://` 的自签名证书服务器时：

1. 应用显示证书错误对话框
2. 点击 "Open URL to Accept Certificate"
3. 浏览器打开后，点击"高级" > "继续访问"
4. 关闭浏览器标签
5. 在应用中重试连接

### 手动接受证书

```bash
# 在浏览器中打开 HTTPS 端点接受证书
open https://your-server-ip:8080

# 或使用 curl 测试
curl -k https://your-server-ip:8080/health
```

---

## 设备身份管理

### 清除设备身份重新配对

如果设备密钥过期或损坏：

**方法 1: 通过应用设置**
1. 打开应用设置
2. 清除当前配置
3. 重新输入服务器 URL
4. 点击保存并重新配对

**方法 2: 清除本地存储**
```bash
# 浏览器中打开开发者工具
# Application > Storage > Clear site data
```

**方法 3: 清除服务器端配对记录**
```bash
# 列出已配对设备
openclaw device pair list

# 撤销特定设备
openclaw device token revoke <device-id>
```

---

## 移动端特殊配置

### Android 模拟器

模拟器无法使用 `localhost` 访问主机：

```
错误配置：ws://localhost:8080
正确配置：ws://10.0.2.2:8080  # Android 模拟器特殊 IP
```

### iOS 模拟器

```
正确配置：ws://host.docker.internal:8080  # Docker 环境
正确配置：ws://<你的 Mac IP>:8080
```

### 真机测试

确保设备与开发机在同一网络：

1. 获取开发机 IP:
   ```bash
   # macOS
   ipconfig getifaddr en0

   # Linux
   hostname -I

   # Windows
   ipconfig
   ```

2. 在手机上配置服务器地址为上述 IP

---

## WebSocket 连接调试

### 使用 wscat 测试连接

```bash
# 安装 wscat
npm install -g wscat

# 测试连接
wscat -c ws://your-server-ip:8080

# 发送测试消息
{"type": "req", "id": "1", "method": "health", "params": {}}
```

### 浏览器开发者工具

1. 打开开发者工具 (F12)
2. 切换到 Network 标签
3. 筛选 WS (WebSocket)
4. 查看连接状态和消息

---

## 服务器配置检查

### 检查 OpenClaw 配置

```bash
# 查看当前配置
openclaw config get

# 检查允许的来源
openclaw config get gateway.controlUi.allowedOrigins

# 设置允许的来源（如果需要）
openclaw config set gateway.controlUi.allowedOrigins '["http://localhost:5173","http://localhost:5174"]'
```

### 检查服务器监听地址

```bash
# 查看服务器监听的地址和端口
netstat -tlnp | grep openclaw
# 或
lsof -i :8080
```

确保服务器监听 `0.0.0.0:8080` 而不是 `127.0.0.1:8080`（后者只允许本地连接）

---

## 常见问题快速修复

### 问题：连接显示 "Connecting..." 然后超时

**原因**: 服务器不可达或防火墙阻止

**解决**:
1. 确认服务器运行：`systemctl status openclaw`
2. 检查防火墙：`sudo ufw status`
3. 测试端口：`telnet server-ip 8080`

### 问题：显示 "NOT_PAIRED"

**原因**: 设备未在服务器端批准

**解决**:
1. 记下应用显示的配对码
2. 在服务器运行：`openclaw device pair approve`
3. 粘贴配对码确认

### 问题：连接成功但无法发送消息

**原因**: 权限不足或 token 过期

**解决**:
1. 检查用户权限：`openclaw device pair list`
2. 重新生成 token
3. 在应用中重新连接

### 问题：移动端无法连接

**原因**: localhost 无法从移动设备访问

**解决**:
1. 使用电脑的实际 IP 地址
2. 确保手机和电脑在同一网络
3. 检查路由器 AP 隔离设置

---

## 获取帮助

如果以上方法都无法解决问题：

1. **收集日志**:
   ```bash
   # 服务器日志
   openclaw logs --tail 100

   # 应用日志（浏览器控制台截图）
   ```

2. **提供以下信息**:
   - 服务器操作系统和版本
   - OpenClaw 版本
   - 客户端平台（桌面/移动）
   - 网络环境（本地/局域网/Tailscale）
   - 完整的错误信息

3. **提交 Issue**:
   https://github.com/jakeledwards/ClawControl/issues

---

## 附录：完整连接流程

```
1. 用户输入服务器 URL →
2. 创建 WebSocket 连接 →
3. 服务器发送 connect.challenge (含 nonce) →
4. 客户端签名挑战（如有设备身份） →
5. 发送 connect 请求 →
6. 服务器验证并返回 hello-ok →
7. 连接成功，开始健康检查
```

如果在任何步骤失败，请参考对应的错误处理章节。
