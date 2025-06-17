import React, { useState, useEffect } from 'react';
import './PdfUpload.css';
import { API_BASE_URL } from '../config';

function PdfUpload() {
    const [files, setFiles] = useState(null);
    const [progress, setProgress] = useState(0);
    const [downloadLinks, setDownloadLinks] = useState([]);
    const [detailedProgress, setDetailedProgress] = useState({
        currentFile: '',
        currentPage: 0,
        totalPages: 0,
        status: '等待上传'
    });
    const [totalProgress, setTotalProgress] = useState({
        processedPages: 0,
        totalPages: 0
    });
    const [isUploading, setIsUploading] = useState(false);
    const [isCompleted, setIsCompleted] = useState(false);
    const [buttonText, setButtonText] = useState('点击上传并解析');
    const fileInputRef = React.createRef();
    const [parsedFiles, setParsedFiles] = useState([]);
    const [previewFile, setPreviewFile] = useState(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);

    // 页面加载时检查处理状态
    useEffect(() => {
        const checkProcessingStatus = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/detailed-progress`);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();

                // 如果状态不是"等待上传"，说明有正在进行的处理
                if (data.status !== '等待处理' && data.status !== '已取消') {
                    setIsUploading(true);
                    setButtonText('取消解析');
                    
                    // 更新进度信息
                    setDetailedProgress({
                        currentFile: data.currentFile || '',
                        currentPage: data.currentPage || 0,
                        totalPages: data.totalPages || 0,
                        status: data.status
                    });
                    
                    // 更新总进度
                    if (data.totalPages > 0) {
                        const newProgress = (data.currentPage / data.totalPages) * 100;
                        setProgress(newProgress);
                        setTotalProgress({
                            processedPages: data.currentPage,
                            totalPages: data.totalPages
                        });
                    }
                    
                    // 如果状态是"已完成"，更新状态
                    if (data.status === '已完成') {
                        setIsCompleted(true);
                        setIsUploading(false);
                        setButtonText('点击上传并解析');
                    }
                } else {
                    // 如果是等待处理或已取消状态，重置所有状态
                    setIsUploading(false);
                    setIsCompleted(false);
                    setProgress(0);
                    setDetailedProgress({
                        currentFile: '',
                        currentPage: 0,
                        totalPages: 0,
                        status: '等待处理'
                    });
                    setTotalProgress({
                        processedPages: 0,
                        totalPages: 0
                    });
                    setButtonText('点击上传并解析');
                    // 重置文件选择状态
                    setFiles(null);
                    if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                    }
                }
            } catch (error) {
                console.error('检查处理状态出错:', error);
            }
        };
        
        checkProcessingStatus();
    }, []);

    // 获取已解析文件列表
    useEffect(() => {
        const fetchParsedFiles = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/parsed-files`);
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
    }, []);

    // 轮询处理进度
    useEffect(() => {
        if (!isUploading || isCompleted) return;

        const interval = setInterval(async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/detailed-progress`);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();

                const newTotalProgress = {
                    processedPages: data.currentPage,
                    totalPages: data.totalPages
                };
                if (
                    newTotalProgress.processedPages !== totalProgress.processedPages ||
                    newTotalProgress.totalPages !== totalProgress.totalPages
                ) {
                    setTotalProgress(newTotalProgress);
                }

                if (data.totalPages > 0) {
                    const newProgress = (data.currentPage / data.totalPages) * 100;
                    if (newProgress !== progress) {
                        setProgress(newProgress);
                    }
                }

                setDetailedProgress({
                    currentFile: data.currentFile || '',
                    currentPage: data.currentPage || 0,
                    totalPages: data.totalPages || 0,
                    status: data.status
                });

                if (data.status === '已完成') {
                    setIsCompleted(true);
                    setIsUploading(false);
                    setButtonText('点击上传并解析');
                    // 重置文件选择
                    setFiles(null);
                    if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                    }
                    // 立即获取最新的已解析文件列表
                    fetchParsedFiles();
                    clearInterval(interval);
                } else if (data.status === '已取消' || data.status === '处理失败') {
                    setIsUploading(false);
                    setButtonText('点击上传并解析');
                    // 重置文件选择状态
                    setFiles(null);
                    if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                    }
                    clearInterval(interval);
                }
            } catch (error) {
                console.error('获取进度出错:', error);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [isUploading, isCompleted, progress, totalProgress]);

    // 获取已解析文件列表的函数
    const fetchParsedFiles = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/parsed-files`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            setParsedFiles(data);
        } catch (error) {
            console.error('获取已解析文件出错:', error);
        }
    };

    // 定期刷新已解析文件列表
    useEffect(() => {
        const interval = setInterval(fetchParsedFiles, 5000); // 每5秒刷新一次
        return () => clearInterval(interval);
    }, []);

    const handleFileChange = (e) => {
        const selectedFiles = e.target.files;
        if (selectedFiles && selectedFiles.length > 0) {
            setFiles(selectedFiles);
        } else {
            setFiles(null);
        }
    };

    const handleUpload = async () => {
        if (!files || files.length === 0) {
            alert('请选择至少一个PDF文件');
            return;
        }
        const formData = new FormData();
        Array.from(files).forEach(file => formData.append('file', file));

        try {
            setIsUploading(true);
            setIsCompleted(false);
            setProgress(0);
            setDetailedProgress({
                currentFile: '',
                currentPage: 0,
                totalPages: 0,
                status: '正在解析中'
            });
            setButtonText('取消解析');

            const response = await fetch(`${API_BASE_URL}/upload`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            if (response.ok) {
                console.log('上传成功:', data);
                if (data.message && data.total_files) {
                    console.log('开始轮询进度');
                    // 立即获取最新的已解析文件列表
                    fetchParsedFiles();
                } else {
                    alert('后端响应格式不正确');
                }
            } else {
                alert(data.error || '文件处理失败');
                // 处理失败时重置文件选择
                setFiles(null);
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            }
        } catch (error) {
            console.error('上传出错:', error);
            alert(`上传出错，请重试。错误信息: ${error.message}`);
            // 发生错误时重置文件选择
            setFiles(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleCancel = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/cancel`, {
                method: 'POST'
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            if (response.ok) {
                console.log('取消处理成功:', data);
                // 重置所有状态
                setIsUploading(false);
                setIsCompleted(false);
                setProgress(0);
                setDetailedProgress({
                    currentFile: '',
                    currentPage: 0,
                    totalPages: 0,
                    status: '等待处理'
                });
                setTotalProgress({
                    processedPages: 0,
                    totalPages: 0
                });
                setButtonText('点击上传并解析');
                // 清空文件选择
                setFiles(null);
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            } else {
                alert(data.error || '取消处理失败');
            }
        } catch (error) {
            console.error('取消处理出错:', error);
            alert(`取消处理出错，请重试。错误信息: ${error.message}`);
        }
    };

    const handleBatchDownload = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/batch-download`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'processed_files.zip';
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
            const response = await fetch(`${API_BASE_URL}/delete/${filename}`, {
                method: 'DELETE'
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            // 删除成功后刷新文件列表
            await fetchParsedFiles();
        } catch (error) {
            console.error('删除出错:', error);
            alert(`删除出错，请重试。错误信息: ${error.message}`);
        }
    };

    const handleDownload = async (filename) => {
        try {
            const response = await fetch(`${API_BASE_URL}/download-single/${filename}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${filename.replace('.pdf', '')}_files.zip`;
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
        <div className={`App ${isPreviewOpen ? 'preview-open' : ''}`}>
            <h1>PDF 文件上传解析 - RAG 知识库制作</h1>
            
            <div className="upload-section">
                <input
                    type="file"
                    accept=".pdf"
                    multiple
                    onChange={handleFileChange}
                    ref={fileInputRef}
                />
                <button
                    onClick={isUploading ? handleCancel : handleUpload}
                    style={{
                        backgroundColor: isUploading ? '#ef4444' : '#6366f1'
                    }}
                >
                    {buttonText}
                </button>
            </div>

            {isUploading && (
                <div className="progress-section">
                    <p className="status-text">总处理进度: {totalProgress.processedPages}/{totalProgress.totalPages} 页 (共 {progress.toFixed(2)}% 完成)</p>
                    <div className="progress-bar">
                        <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
                    </div>
                    <p className="status-text">状态: {detailedProgress.status}</p>
                </div>
            )}

            {!isUploading && (downloadLinks.length > 0 || parsedFiles.length > 0) && (
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
                            data={`${API_BASE_URL}/preview/${previewFile}`}
                            type="application/pdf"
                        >
                            <p>无法加载PDF预览，请<a href={`${API_BASE_URL}/preview/${previewFile}`} target="_blank" rel="noopener noreferrer">点击此处</a>在新窗口中查看。</p>
                        </object>
                    </div>
                )}
            </div>
        </div>
    );
}

export default PdfUpload; 