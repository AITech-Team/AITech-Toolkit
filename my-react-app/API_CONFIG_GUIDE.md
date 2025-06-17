# API配置自动获取指南

本项目现在支持自动获取本机IP地址，无需手动配置。以下是详细的使用说明。

## 🚀 快速开始

### 方法1：使用React Hook（推荐）

```jsx
import React from 'react';
import { useApiConfig } from './hooks/useApiConfig';

function MyComponent() {
    const { apiUrl, isLoading, error } = useApiConfig();
    
    if (isLoading) return <div>正在检测API服务器...</div>;
    if (error) return <div>配置错误: {error}</div>;
    
    return <div>API服务器: {apiUrl}</div>;
}
```

### 方法2：直接使用配置管理器

```jsx
import apiConfigManager from './utils/apiConfig';

// 获取API URL
const apiUrl = await apiConfigManager.getApiUrl();

// 手动设置API URL
apiConfigManager.setApiUrl('http://192.168.1.100:8000');
```

### 方法3：使用传统方式（兼容性）

```jsx
import { API_BASE_URL } from './config';

// 直接使用（会自动检测当前主机IP）
console.log('API URL:', API_BASE_URL);
```

## 🔧 配置选项

### 环境变量配置

创建 `.env.local` 文件：

```bash
# 指定API服务器主机（可选）
REACT_APP_API_HOST=10.255.11.3

# 指定API服务器端口（默认8000）
REACT_APP_API_PORT=8000

# 开发环境备用IP列表
REACT_APP_DEV_IPS=10.255.11.3,192.168.1.100,192.168.0.100

# 网络超时设置（毫秒）
REACT_APP_NETWORK_TIMEOUT=5000
```

### Hook配置选项

```jsx
const { apiUrl } = useApiConfig({
    autoDetect: true,           // 是否自动检测
    enableHealthCheck: true,    // 是否启用健康检查
    healthCheckInterval: 30000  // 健康检查间隔（毫秒）
});
```

## 📋 功能特性

### 1. 自动IP检测
- 优先使用环境变量配置
- 自动使用当前访问的主机IP
- 支持WebRTC获取本地IP
- 智能回退到默认IP

### 2. 健康检查
- 定期检查API服务器状态
- 自动故障转移
- 支持多个备用服务器

### 3. 故障转移
- 自动切换到可用服务器
- 支持手动故障转移
- 实时服务器状态监控

### 4. 管理界面
使用 `ApiConfigPanel` 组件：

```jsx
import ApiConfigPanel from './components/ApiConfigPanel';

function App() {
    return (
        <div>
            <ApiConfigPanel />
            {/* 其他组件 */}
        </div>
    );
}
```

## 🔍 IP检测优先级

1. **环境变量** - `REACT_APP_API_HOST`
2. **当前主机IP** - `window.location.hostname`
3. **WebRTC检测** - 通过WebRTC获取本地IP
4. **备用IP列表** - 环境变量中的备用IP
5. **默认IP** - 硬编码的回退IP

## 🛠️ 部署到不同机器

### 开发环境
```bash
# 不需要任何配置，会自动使用当前主机IP
npm start
```

### 生产环境
```bash
# 方法1：使用环境变量
export REACT_APP_API_HOST=your-server-ip
npm run build

# 方法2：创建.env.production文件
echo "REACT_APP_API_HOST=your-server-ip" > .env.production
npm run build
```

### Docker部署
```dockerfile
# 在Dockerfile中设置环境变量
ENV REACT_APP_API_HOST=your-server-ip

# 或在docker-compose.yml中设置
environment:
  - REACT_APP_API_HOST=your-server-ip
```

## 🔧 故障排除

### 常见问题

1. **无法检测到API服务器**
   - 检查防火墙设置
   - 确认API服务器正在运行
   - 检查端口是否正确

2. **WebRTC检测失败**
   - 某些浏览器可能阻止WebRTC
   - 使用环境变量手动指定IP

3. **健康检查失败**
   - 确保API服务器有健康检查端点
   - 检查网络连接

### 调试模式

在浏览器控制台中查看详细日志：

```javascript
// 查看当前配置
console.log('API URL:', await apiConfigManager.getApiUrl());

// 查看可用服务器
console.log('Available servers:', apiConfigManager.availableHosts);

// 手动重新检测
await apiConfigManager.autoDetectApiServer();
```

## 📝 迁移指南

### 从固定IP迁移

如果您之前使用固定IP配置：

```javascript
// 旧方式
export const API_BASE_URL = 'http://10.255.11.3:8000';

// 新方式（自动检测）
// 不需要修改，会自动使用当前主机IP
```

### 更新现有代码

```javascript
// 旧方式
import { API_BASE_URL } from './config';

// 新方式（推荐）
import { useApiUrl } from './hooks/useApiConfig';

function MyComponent() {
    const { apiUrl } = useApiUrl();
    // 使用 apiUrl 替代 API_BASE_URL
}
```

## 🎯 最佳实践

1. **开发环境**：让系统自动检测，无需配置
2. **测试环境**：使用环境变量指定固定IP
3. **生产环境**：使用环境变量或配置文件
4. **容器部署**：通过环境变量传递配置
5. **多服务器**：配置备用IP列表实现高可用

这样配置后，您的应用就可以在任何机器上自动检测并使用正确的API服务器地址了！
