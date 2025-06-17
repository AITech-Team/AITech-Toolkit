import React, { useState, useEffect } from 'react';
import './PdfReader.css';
import { API_BASE_URL } from '../config';

function PdfReader() {
    const [files, setFiles] = useState(null);
    const [selectedFileName, setSelectedFileName] = useState('');
    const [progress, setProgress] = useState(0);
    const [detailedProgress, setDetailedProgress] = useState({
        currentFile: '',
        currentPage: 0,
        totalPages: 0,
        status: '等待上传'
    });
    const [isUploading, setIsUploading] = useState(false);
    const [isCompleted, setIsCompleted] = useState(false);
    const [buttonText, setButtonText] = useState('点击上传并解析');
    const fileInputRef = React.createRef();
    const [parsedFiles, setParsedFiles] = useState([]);
    const [previewFile, setPreviewFile] = useState(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);

    // 页面加载时获取已处理的文件列表和当前处理状态
    useEffect(() => {
        const fetchInitialState = async () => {
            try {
                // 获取已处理文件列表
                const filesResponse = await fetch(`${API_BASE_URL}/api/pdf-reader/files`);
                if (!filesResponse.ok) {
                    throw new Error(`HTTP error! status: ${filesResponse.status}`);
                }
                const filesData = await filesResponse.json();
                setParsedFiles(filesData);

                // 获取当前处理状态
                const progressResponse = await fetch(`${API_BASE_URL}/api/pdf-reader/progress`);
                if (!progressResponse.ok) {
                    throw new Error(`HTTP error! status: ${progressResponse.status}`);
                }
                const progressData = await progressResponse.json();
                
                // 如果状态是"已完成"或"已取消"，重置状态
                if (progressData.status === '已完成' || progressData.status === '已取消') {
                    setIsUploading(false);
                    setIsCompleted(true);
                    setButtonText('点击上传并解析');
                    setFiles(null);
                    setSelectedFileName('');
                    if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                    }
                } else if (progressData.status === '正在处理') {
                    // 如果状态是"正在处理"，恢复上传状态
                    setIsUploading(true);
                    setIsCompleted(false);
                    setButtonText('取消解析');
                    setProgress((progressData.currentPage / progressData.totalPages) * 100);
                    setDetailedProgress(progressData);
                }
            } catch (error) {
                console.error('获取初始状态出错:', error);
            }
        };
        fetchInitialState();
    }, []);

    // 轮询进度
    useEffect(() => {
        if (!isUploading || isCompleted) return;

        const interval = setInterval(async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/api/pdf-reader/progress`);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();

                console.log('进度数据:', data);

                // 更新进度显示
                if (data.status === '正在处理') {
                    setProgress(0); // 处理中显示0%
                    setDetailedProgress(data);
                } else if (data.status === '已完成') {
                    setProgress(100); // 完成时显示100%
                    setDetailedProgress({ ...data, status: '已完成' });
                    setIsCompleted(true);
                    setIsUploading(false);
                    setButtonText('点击上传并解析');
                    clearInterval(interval);
                    setFiles(null);
                    setSelectedFileName('');
                    if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                    }
                    // 刷新文件列表
                    const fetchParsedFiles = async () => {
                        try {
                            const response = await fetch(`${API_BASE_URL}/api/pdf-reader/files`);
                            if (!response.ok) {
                                throw new Error(`HTTP error! status: ${response.status}`);
                            }
                            const data = await response.json();
                            setParsedFiles(data);
                        } catch (error) {
                            console.error('获取已解析文件出错:', error);
                        }
                    };
                    fetchParsedFiles();
                } else if (data.status === '已取消') {
                    setProgress(0);
                    setDetailedProgress({ ...data, status: '已取消' });
                    setIsUploading(false);
                    setIsCompleted(false);
                    setButtonText('点击上传并解析');
                    clearInterval(interval);
                    setFiles(null);
                    setSelectedFileName('');
                    if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                    }
                } else {
                    setDetailedProgress(data);
                }
            } catch (error) {
                console.error('获取进度出错:', error);
            }
        }, 500);

        return () => clearInterval(interval);
    }, [isUploading, isCompleted]);

    const handleFileChange = (e) => {
        const selectedFiles = e.target.files;
        if (selectedFiles && selectedFiles.length > 0) {
            setFiles(selectedFiles);
            setSelectedFileName(selectedFiles[0].name);
        } else {
            setFiles(null);
            setSelectedFileName('');
        }
    };

    const handleFileInputClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        setSelectedFileName('');
    };

    const handleUpload = async () => {
        if (!files || files.length === 0) {
            alert('请选择至少一个文件');
            return;
        }

        const formData = new FormData();
        formData.append('file', files[0]);

        try {
            setIsUploading(true);
            setIsCompleted(false);
            setProgress(0);
            setDetailedProgress({
                currentFile: files[0].name,
                currentPage: 0,
                totalPages: 0,
                status: '正在上传'
            });
            setButtonText('取消解析');

            console.log('开始上传文件:', files[0].name);

            const response = await fetch(`${API_BASE_URL}/api/pdf-reader/upload`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || '文件处理失败');
            }

            const data = await response.json();
            console.log('上传成功:', data);
        } catch (error) {
            console.error('上传出错:', error);
            alert(`上传出错，请重试。错误信息: ${error.message}`);
            setIsUploading(false);
            setButtonText('点击上传并解析');
            setFiles(null);
            setSelectedFileName('');
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleCancel = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/pdf-reader/cancel`, {
                method: 'POST'
            });
            
            if (!response.ok) {
                throw new Error('取消处理失败');
            }
            
            setIsUploading(false);
            setIsCompleted(false);
            setProgress(0);
            setDetailedProgress({
                currentFile: '',
                currentPage: 0,
                totalPages: 0,
                status: '等待上传'
            });
            setButtonText('点击上传并解析');
            setFiles(null);
            setSelectedFileName('');
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        } catch (error) {
            console.error('取消解析出错:', error);
            alert(`取消解析出错，请重试。错误信息: ${error.message}`);
        }
    };

    const handleBatchDownload = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/pdf-reader/batch-download`);
            if (!response.ok) {
                throw new Error('批量下载失败');
            }
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'pdf_reader_files.zip';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('批量下载出错:', error);
            alert(`批量下载出错，请重试。错误信息: ${error.message}`);
        }
    };

    const handleDelete = async (filename) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/pdf-reader/delete/${filename}`, {
                method: 'DELETE'
            });
            if (!response.ok) {
                throw new Error('删除失败');
            }
            const fetchParsedFiles = async () => {
                try {
                    const response = await fetch(`${API_BASE_URL}/api/pdf-reader/files`);
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    const data = await response.json();
                    setParsedFiles(data);
                } catch (error) {
                    console.error('获取已解析文件出错:', error);
                }
            };
            fetchParsedFiles();
        } catch (error) {
            console.error('删除出错:', error);
            alert(`删除出错，请重试。错误信息: ${error.message}`);
        }
    };

    const handleDownload = async (filename) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/pdf-reader/download/${filename}`);
            if (!response.ok) {
                throw new Error('下载失败');
            }
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('下载出错:', error);
            alert(`下载出错，请重试。错误信息: ${error.message}`);
        }
    };

    const handlePreview = (filename) => {
        setPreviewFile(filename);
        setIsPreviewOpen(true);
        document.body.style.overflow = 'hidden';
    };

    const closePreview = () => {
        setIsPreviewOpen(false);
        setPreviewFile(null);
        document.body.style.overflow = 'auto';
    };

    return (
        <div className={`pdf-reader-app ${isPreviewOpen ? 'preview-open' : ''}`}>
            <h1>多格式文档解读 - 智能分析报告生成</h1>
            
            <div className="upload-section">
                <input
                    type="file"
                    accept=".pdf,.docx,.doc,.xlsx,.xls,.pptx,.ppt,.srt,.txt"
                    onChange={handleFileChange}
                    onClick={handleFileInputClick}
                    ref={fileInputRef}
                />
                {selectedFileName && (
                    <div className="selected-file-info">
                        <span className="file-icon">📄</span>
                        <span className="file-name">已选择: {selectedFileName}</span>
                    </div>
                )}
                <button
                    onClick={isUploading ? handleCancel : handleUpload}
                    style={{
                        backgroundColor: isUploading ? '#ef4444' : '#6366f1'
                    }}
                >
                    {buttonText}
                </button>
                <div className="supported-formats">
                    <p>支持的文件格式：</p>
                    <div className="format-tags">
                        <span className="format-tag">PDF</span>
                        <span className="format-tag">Word (DOC/DOCX)</span>
                        <span className="format-tag">Excel (XLS/XLSX)</span>
                        <span className="format-tag">PowerPoint (PPT/PPTX)</span>
                        <span className="format-tag">字幕文件 (SRT)</span>
                        <span className="format-tag">文本文件 (TXT)</span>
                    </div>
                </div>
            </div>

            {isUploading && (
                <div className="progress-section">
                    <p className="status-text">状态: {detailedProgress.status}</p>
                    <p className="status-text">当前文件: {detailedProgress.currentFile}</p>
                </div>
            )}

            {!isUploading && parsedFiles.length > 0 && (
                <div className="files-list">
                    <h2>已处理的文件</h2>
                    <button
                        className="batch-download-button"
                        onClick={handleBatchDownload}
                    >
                        批量下载所有文件(ZIP)
                    </button>
                    <ul>
                        {parsedFiles.map((file, index) => (
                            <li key={index}>
                                <span className="file-name">{file}</span>
                                <div className="file-actions">
                                    <button onClick={() => handleDelete(file)}>删除</button>
                                    <button onClick={() => handleDownload(file)}>下载</button>
                                    <button onClick={() => handlePreview(file)}>预览</button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* 预览模态框 */}
            <div className={`preview-modal ${isPreviewOpen ? 'open' : ''}`}>
                {previewFile && (
                    <div className="preview-content">
                        <div className="preview-header">
                            <h3>{previewFile}</h3>
                            <button className="close-preview" onClick={closePreview}>&times;</button>
                        </div>
                        <object
                            className="preview-iframe"
                            data={`${API_BASE_URL}/api/pdf-reader/preview/${previewFile}`}
                            type="application/pdf"
                        >
                            <p>无法加载PDF预览，请<a href={`${API_BASE_URL}/api/pdf-reader/preview/${previewFile}`} target="_blank" rel="noopener noreferrer">点击此处</a>在新窗口中查看。</p>
                        </object>
                    </div>
                )}
            </div>
        </div>
    );
}

export default PdfReader; 