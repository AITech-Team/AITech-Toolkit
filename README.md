# 🚀 AITech-Toolkit

> **AI驱动的多功能文档处理工具包** - 集成PDF解析、智能文档解读、视频转录、AI资讯聚合于一体的现代化Web平台

## ✨ 项目亮点

AITech-Toolkit 是一个功能强大的AI驱动文档处理平台，专为提高工作效率而设计。它将多种AI技术整合到一个易用的Web界面中，让复杂的文档处理变得简单高效。

### 🎯 核心优势

- **🤖 AI智能化**: 集成OpenAI Whisper和GPT，提供智能文档分析和语音识别
- **📄 全格式支持**: 支持PDF、Word、Excel、PowerPoint、视频、音频等多种格式
- **🔄 批量处理**: 支持多文件批量上传和并行处理，大幅提升效率
- **👥 多用户友好**: 基于IP的用户隔离，确保数据安全和隐私
- **📱 响应式设计**: 现代化UI设计，完美适配桌面和移动设备
- **🌐 跨平台部署**: 支持Windows、macOS、Linux多平台部署

## 🛠️ 功能模块

### 📊 PDF智能解析
- **OCR文字识别**: 高精度图像文字提取，支持中英文混合识别
- **结构化输出**: 自动生成JSON、Word、PDF格式的结构化文档
- **批量处理**: 支持多文件同时处理，实时进度监控
- **智能分页**: 自动识别文档结构，保持原有格式

### 🧠 AI文档解读
- **多格式兼容**: 支持PDF、DOCX、PPTX、XLSX、TXT、SRT等格式
- **智能摘要**: 基于大语言模型的文档内容分析和摘要生成
- **关键信息提取**: 自动识别和提取文档中的关键信息点
- **定制化报告**: 根据用户需求生成个性化分析报告

### 🎥 视频智能转录
- **多格式支持**: 兼容MP4、AVI、MOV、MKV、WMV、FLV等主流视频格式
- **双重输出**: 同时生成SRT字幕文件和纯文本转录

### 📰 AI资讯聚合
- **实时更新**: AI领域最新资讯和技术动态
- **智能分类**: 自动分类和标签化新闻内容
- **PDF阅读**: 内置PDF阅读器，支持在线预览和下载
- **个性化推荐**: 基于用户行为的智能内容推荐

## 🚀 快速开始

### 环境要求

| 组件 | 版本要求 | 说明 |
|------|----------|------|
| Python | 3.8+ | 核心运行环境 |
| Node.js | 16.0+ | 仅开发时需要 |
| 内存 | 8GB+ | 推荐配置 |
| 存储 | 2GB+ | 最小可用空间 |
| 网络 | 稳定连接 | AI功能需要 |

### 一键安装

```bash
# 1. 克隆项目
git clone https://github.com/AITech-Team/AITech-Toolkit.git
cd AITech-Toolkit

# 2. 安装Python依赖
pip install -r requirements.txt

# 3. 启动后端服务器
python app.py

# 2. 新开终端，启动前端开发服务器
cd my-react-app
npm install
npm start  # 前端开发服务器运行在 http://localhost:3000
```

### 访问应用

🌐 打开浏览器访问 **http://localhost:3000** （前端开发服务器）

## 🏗️ 文件结构

```
AITech-Toolkit/
├── 📄 app.py                   # Flask后端主程序
├── 📄 requirements.txt         # Python依赖列表
├── 📄 .gitignore              # Git忽略文件
├── 📄 LICENSE                  # MIT许可证
├── 📄 README.md               # 项目说明文档
├── 📂 my-react-app/           # React前端应用
│   ├── 📁 public/             # 静态资源
│   ├── 📁 src/                # 前端源代码
│   ├── 📁 build/              # 构建输出（生产）
│   └── 📄 package.json        # 前端依赖配置
└── 📂 modules/                # 后端功能模块
    ├── 📄 document_interpretation.py  # 文档解读
    ├── 📄 pdf_image_processor.py      # PDF处理
    └── 📄 video_processor.py          # 视频处理
```

## ⚙️ 配置指南

### 🔑 API密钥配置
需自行替换如下文件中的部分
modules\document_interpretation.py
modules\pdf_image_processor.py
```bash
    api_key='your_api_key'

```

### 🌐 网络配置

AITech-Toolkit 支持多种部署场景：

- **本地开发**: 自动检测localhost环境
- **局域网部署**: 智能获取内网IP地址
- **反向代理**: 支持Nginx、Apache等代理服务器
- **云服务**: 兼容AWS、Azure、GCP等云平台

## 🎯 使用指南

### 1️⃣ PDF智能解析
1. 选择"PDF解析"模块
2. 拖拽或点击上传PDF文件
3. 等待OCR处理完成
4. 下载结构化结果文件

### 2️⃣ AI文档解读
1. 进入"文档解读"功能
2. 上传支持格式的文档
3. 选择分析类型和深度
4. 获取AI生成的智能报告

### 3️⃣ 视频智能转录
1. 访问"视频转录"模块
2. 上传视频文件
3. 选择转录语言和格式
4. 下载SRT字幕和文本文件

### 4️⃣ AI资讯浏览
1. 点击"AI资讯"板块
2. 浏览最新AI技术动态
3. 在线阅读PDF格式报告
4. 收藏感兴趣的内容

## 🔧 开发指南

### 前端开发

```bash
# 进入前端目录
cd my-react-app

# 安装前端依赖
npm install

# 启动开发服务器（热重载）
npm start      # 运行在 http://localhost:3000

# 构建生产版本
npm run build  # 构建到 build/ 目录

# 其他可用命令
npm test       # 运行测试
npm run eject  # 弹出配置（不可逆）
```

**前端开发说明**：
- 开发服务器支持热重载，修改代码后自动刷新
- API请求会自动代理到后端服务器 (localhost:8000)
- 构建后的文件会放在 `my-react-app/build/` 目录
- 后端服务器会自动服务构建后的前端文件
- poppler依赖需要自行安装

### 后端开发

```bash
# 开发模式启动
python app.py

# 生产部署
gunicorn -w 4 -b 0.0.0.0:8000 app:app
```

### 代码规范

- **Python**: 遵循PEP 8代码规范
- **JavaScript**: 使用ESLint和Prettier
- **API设计**: RESTful风格，统一错误处理
- **文档**: 完整的函数和类注释

## 🚀 部署建议

### 开发环境
```bash
python app.py  # 开发服务器
```

### 生产环境
```bash
# 使用Gunicorn
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:8000 app:app

# 使用Docker
docker build -t aitech-toolkit .
docker run -p 8000:8000 aitech-toolkit
```

### Nginx配置示例
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 🔍 故障排除

### 常见问题解决

<details>
<summary>🐛 依赖安装失败</summary>

```bash
# 升级pip
python -m pip install --upgrade pip

# 使用国内镜像
pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple/

# 清理缓存
pip cache purge
```
</details>

<details>
<summary>🔧 Windows系统问题</summary>

- 确保安装Microsoft Office或LibreOffice
- 以管理员权限运行Python
- 检查Windows Defender防火墙设置
</details>

<details>
<summary>🤖 AI功能异常</summary>

- 验证API密钥有效性
- 检查网络连接状态
- 确认API额度充足
- 查看控制台错误日志
</details>

<details>
<summary>🎥 视频处理失败</summary>

- 确认视频格式支持
- 检查磁盘空间充足
- 首次使用需下载Whisper模型
- 尝试较小的视频文件测试
</details>

## 🤝 贡献指南

我们欢迎所有形式的贡献！

### 如何贡献

1. **Fork** 本项目
2. **创建** 功能分支 (`git checkout -b feature/AmazingFeature`)
3. **提交** 更改 (`git commit -m 'Add some AmazingFeature'`)
4. **推送** 到分支 (`git push origin feature/AmazingFeature`)
5. **创建** Pull Request

### 贡献类型

- 🐛 Bug修复
- ✨ 新功能开发
- 📚 文档改进
- 🎨 UI/UX优化
- 🔧 性能优化
- 🧪 测试用例

## 📄 开源协议

本项目采用 [MIT License](LICENSE) 开源协议。

## 🔗 相关资源

| 资源 | 链接 | 描述 |
|------|------|------|
| 📖 Flask文档 | [flask.palletsprojects.com](https://flask.palletsprojects.com/) | Web框架官方文档 |
| ⚛️ React文档 | [reactjs.org](https://reactjs.org/) | 前端框架官方文档 |
| 🤖 OpenAI API | [platform.openai.com](https://platform.openai.com/docs/) | AI服务官方文档 |
| 🎵 Whisper | [github.com/openai/whisper](https://github.com/openai/whisper) | 语音识别模型 |

## 📞 支持与反馈

### 获取帮助

- 🐛 [提交Issue](https://github.com/AITech-Team/AITech-Toolkit/issues)
- 💬 [参与讨论](https://github.com/AITech-Team/AITech-Toolkit/discussions)

### 社区

- 🌟 给项目点个Star支持我们
- 🔄 Fork项目参与开发
- 📢 分享给更多需要的人


---

<div align="center">

**🚀 AITech-Toolkit - 让AI技术触手可及！**

*如果这个项目对您有帮助，请给我们一个 ⭐ Star！*

</div> 