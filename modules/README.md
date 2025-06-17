# 功能模块文件夹

这个文件夹包含了项目的核心功能模块，用于组织和管理各种业务功能。

## 当前模块

### 1. document_interpretation.py
- **功能**: 文档解读功能模块
- **主要功能**: 
  - 支持多种文档格式（PDF、Word、Excel、PowerPoint、SRT、TXT）
  - 文本提取和语言检测
  - 使用AI模型进行文档总结和解读
  - 生成格式化的Word文档输出

### 2. pdf_image_processor.py  
- **功能**: PDF图像处理功能模块
- **主要功能**:
  - PDF转图片处理
  - 使用多模态AI模型分析图片内容
  - 提取文本、图表、图像元素
  - 生成JSON和Word格式的结果

### 3. video_processor.py
- **功能**: 视频处理功能模块
- **主要功能**:
  - 视频音频提取和处理
  - 音频降噪和增强
  - 使用Whisper模型进行语音转文字
  - 生成SRT字幕文件和纯文本文件

## 文件夹结构
```
modules/
├── __init__.py              # 包初始化文件
├── README.md               # 说明文档
├── document_interpretation.py
├── pdf_image_processor.py
└── video_processor.py
```

## 使用方式

在主应用中导入模块：
```python
from modules.document_interpretation import process_single_document
from modules.pdf_image_processor import process_pdf
from modules.video_processor import transcribe_single_video
```

## 扩展说明

后续添加的新功能模块都应该放在这个文件夹中，保持项目结构的整洁和模块化。每个新模块都应该：

1. 有清晰的功能定义
2. 包含必要的文档注释
3. 遵循项目的编码规范
4. 在此README中添加相应的说明 