import React, { useState, useEffect, useRef } from 'react';
import './VideoProcessor.css';
import { API_BASE_URL } from '../config';

function VideoProcessor() {
    // 视频处理相关状态
    const [videoFiles, setVideoFiles] = useState(null);
    const [videoDownloadLinks, setVideoDownloadLinks] = useState([]);
    const [parsedVideoFiles, setParsedVideoFiles] = useState([]);
    const [isVideoUploading, setIsVideoUploading] = useState(false);
    const [isVideoCompleted, setIsVideoCompleted] = useState(false);
    const [videoButtonText, setVideoButtonText] = useState('点击上传视频并转文字');
    const videoFileInputRef = useRef(null);
    const [previewFile, setPreviewFile] = useState(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [previewContent, setPreviewContent] = useState('');

    // 添加一个新的状态来跟踪视频处理状态
    const [videoProcessingStatus, setVideoProcessingStatus] = useState({
        status: '等待处理',
        currentFile: ''
    });

    // 获取API端点
    const getApiEndpoint = (endpoint) => {
        return `${API_BASE_URL}/${endpoint}`;
    };

    // 将 fetchParsedVideoFiles 函数提升到组件顶层
    const fetchParsedVideoFiles = async () => {
        try {
            const response = await fetch(getApiEndpoint('video-parsed-files'));
            const data = await response.json();
            setParsedVideoFiles(data);
        } catch (error) {
            console.error('获取已处理视频文件出错:', error);
        }
    };

    // 获取已处理的视频文件列表
    useEffect(() => {
        fetchParsedVideoFiles();
    }, []);

    // 组件挂载时获取当前视频处理状态
    useEffect(() => {
        const fetchInitialVideoProgress = async () => {
            try {
                const response = await fetch(getApiEndpoint('video-progress'));
                const data = await response.json();

                // 更新视频处理状态
                setVideoProcessingStatus({
                    status: data.status || '等待处理',
                    currentFile: data.currentFile || ''
                });

                // 根据后端状态设置前端UI状态
                if (data.status === '已完成') {
                    setVideoDownloadLinks(['processed_video_files.zip']);
                    setIsVideoCompleted(true);
                    setIsVideoUploading(false);
                    setVideoButtonText('点击上传视频并转文字');
                } else if (data.status === '正在处理中') {
                    setIsVideoUploading(true);
                    setIsVideoCompleted(false);
                    setVideoButtonText('取消解析');
                } else if (data.status === '已取消' || data.status === '处理失败') {
                    setIsVideoUploading(false);
                    setIsVideoCompleted(false);
                    setVideoButtonText('点击上传视频并转文字');
                    // 重置文件选择状态
                    setVideoFiles(null);
                    if (videoFileInputRef.current) {
                        videoFileInputRef.current.value = '';
                    }
                } else {
                    // 默认状态：等待处理
                    setIsVideoUploading(false);
                    setIsVideoCompleted(false);
                    setVideoButtonText('点击上传视频并转文字');
                    // 重置文件选择状态
                    setVideoFiles(null);
                    if (videoFileInputRef.current) {
                        videoFileInputRef.current.value = '';
                    }
                }
            } catch (error) {
                console.error('获取初始视频进度出错:', error);
                // 出错时设置为默认状态
                setVideoProcessingStatus({
                    status: '等待处理',
                    currentFile: ''
                });
                setIsVideoUploading(false);
                setIsVideoCompleted(false);
                setVideoButtonText('点击上传视频并转文字');
                // 重置文件选择状态
                setVideoFiles(null);
                if (videoFileInputRef.current) {
                    videoFileInputRef.current.value = '';
                }
            }
        };
        fetchInitialVideoProgress();
    }, []);

    // 修改轮询逻辑
    useEffect(() => {
        let interval;
        let isPolling = false;

        const startPolling = () => {
            if (isPolling) return;
            isPolling = true;

            interval = setInterval(async () => {
                try {
                    const response = await fetch(getApiEndpoint('video-progress'));
                    const data = await response.json();

                    // 更新处理状态
                    setVideoProcessingStatus(prevStatus => ({
                        status: data.status,
                        currentFile: data.currentFile || prevStatus.currentFile
                    }));

                    // 只有在后端明确返回"已完成"状态时才结束处理
                    if (data.status === '已完成') {
                        setVideoDownloadLinks(['processed_video_files.zip']);
                        setIsVideoCompleted(true);
                        setIsVideoUploading(false);
                        setVideoButtonText('点击上传视频并转文字');
                        setVideoFiles(null); // 重置文件选择状态
                        if (videoFileInputRef.current) {
                            videoFileInputRef.current.value = '';
                        }
                        await fetchParsedVideoFiles();
                        clearInterval(interval);
                        isPolling = false;
                    }
                    // 处理取消和失败状态
                    else if (data.status === '已取消' || data.status === '处理失败') {
                        setIsVideoUploading(false);
                        setIsVideoCompleted(false);
                        setVideoProcessingStatus({
                            status: data.status,
                            currentFile: data.currentFile || videoProcessingStatus.currentFile
                        });
                        setVideoButtonText('点击上传视频并转文字');
                        setVideoFiles(null); // 重置文件选择状态
                        if (videoFileInputRef.current) {
                            videoFileInputRef.current.value = '';
                        }
                        await fetchParsedVideoFiles();
                        clearInterval(interval);
                        isPolling = false;
                    }
                    // 处理中状态
                    else if (data.status === '正在处理中') {
                        setIsVideoCompleted(false);
                        setIsVideoUploading(true);
                        setVideoButtonText('取消解析');
                    }
                    // 等待处理状态 - 只有在已经上传的情况下才保持上传状态
                    else if (data.status === '等待处理' && isVideoUploading) {
                        setIsVideoCompleted(false);
                        setVideoButtonText('取消解析');
                    }
                } catch (error) {
                    console.error('获取视频进度出错:', error);
                }
            }, 500);
        };

        // 修改轮询启动条件 - 只有在真正上传或处理中时才启动轮询
        if (isVideoUploading || videoProcessingStatus.status === '正在处理中') {
            startPolling();
        }

        return () => {
            if (interval) {
                clearInterval(interval);
                isPolling = false;
            }
        };
    }, [isVideoUploading, videoProcessingStatus.status]); // 添加 videoProcessingStatus.status 作为依赖

    // 修改文件选择处理函数，移除对已处理文件的检查
    const handleVideoFileChange = (e) => {
        const selectedFiles = e.target.files;
        if (selectedFiles && selectedFiles.length > 0) {
            setVideoFiles(selectedFiles);
        } else {
            setVideoFiles(null);
        }
    };

    // 修改视频上传处理函数
    const handleVideoUpload = async () => {
        if (!videoFiles || videoFiles.length === 0) {
            alert('请选择至少一个视频文件');
            return;
        }

        // 移除文件大小检查，按照front_back的实现

        const formData = new FormData();
        Array.from(videoFiles).forEach(file => formData.append('file', file));

        try {
            // 保存当前文件名，避免后续 videoFiles 被清空
            const currentFileName = videoFiles[0].name;

            const response = await fetch(getApiEndpoint('upload-video'), {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (response.ok) {
                console.log('视频上传成功:', data);
                if (data.message && data.total_files) {
                    console.log('开始处理视频');
                    // 只有在成功时才设置上传状态
                    setIsVideoUploading(true);
                    setIsVideoCompleted(false);
                    setVideoProcessingStatus({
                        status: '等待处理',
                        currentFile: currentFileName
                    });
                    setVideoButtonText('取消解析');
                } else {
                    resetVideoStates();
                    alert('视频后端响应格式不正确');
                }
            } else {
                resetVideoStates();
                alert(data.error || '视频文件处理失败');
            }
        } catch (error) {
            resetVideoStates();
            console.error('视频上传出错:', error);
            alert(`视频上传出错，请重试。错误信息: ${error.message}`);
        }
    };

    // 添加一个重置视频状态的函数
    const resetVideoStates = () => {
        setIsVideoUploading(false);
        setIsVideoCompleted(false);
        setVideoProcessingStatus({
            status: '等待处理',
            currentFile: ''
        });
        setVideoButtonText('点击上传视频并转文字');
        setVideoFiles(null);
        if (videoFileInputRef.current) {
            videoFileInputRef.current.value = '';
        }
    };

    // 修改取消视频解析函数
    const handleVideoCancel = async () => {
        try {
            const response = await fetch(getApiEndpoint('video-cancel'), {
                method: 'POST'
            });
            if (response.ok) {
                const data = await response.json();
                // 等待后端确认取消后再更新状态
                if (data.status === '已取消' || data.message === 'Video processing canceled') {
                    setIsVideoUploading(false);
                    setIsVideoCompleted(false);
                    setVideoProcessingStatus({
                        status: '已取消',
                        currentFile: videoProcessingStatus.currentFile
                    });
                    setVideoButtonText('点击上传视频并转文字');
                    setVideoFiles(null); // 重置文件选择状态
                    if (videoFileInputRef.current) {
                        videoFileInputRef.current.value = '';
                    }
                    await fetchParsedVideoFiles();
                }
            } else {
                alert('取消视频解析失败');
            }
        } catch (error) {
            console.error('取消视频解析出错:', error);
            alert(`取消视频解析出错，请重试。错误信息: ${error.message}`);
        }
    };

    // 批量下载视频文件
    const handleVideoBatchDownload = () => {
        fetch(getApiEndpoint('video-batch-download'))
           .then(response => response.blob())
           .then(blob => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'processed_video_files.zip';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            });
    };

    // 删除视频文件
    const handleVideoDelete = async (filename) => {
        try {
            const response = await fetch(getApiEndpoint(`video-delete/${filename}`), {
                method: 'DELETE'
            });
            if (response.ok) {
                // 重新获取已处理的视频文件列表
                await fetchParsedVideoFiles();
            } else {
                alert('删除视频文件失败');
            }
        } catch (error) {
            console.error('删除视频文件出错:', error);
            alert(`删除视频文件出错，请重试。错误信息: ${error.message}`);
        }
    };

    // 下载单个视频文件
    const handleVideoDownload = async (filename) => {
        try {
            const response = await fetch(getApiEndpoint(`video-download-single/${filename}`));
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${filename.replace('.mp4', '')}_video_files.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('下载视频文件出错:', error);
            alert(`下载视频文件出错，请重试。错误信息: ${error.message}`);
        }
    };

    // 修改预览视频文件函数，使用右侧滑出预览窗口
    const handleVideoPreview = async (filename) => {
        try {
            setPreviewFile(filename);
            setIsPreviewOpen(true);
            setPreviewContent('正在加载预览内容...');
            document.body.style.overflow = 'hidden';

            const encodedFilename = encodeURIComponent(filename);
            const previewUrl = getApiEndpoint(`video-preview/${encodedFilename}`);
            const response = await fetch(previewUrl);
            
            if (response.ok) {
                const data = await response.json();
                if (data.content) {
                    // 解码Unicode字符
                    const decodedContent = data.content.replace(/\\u([0-9a-fA-F]{4})/g, (match, grp) => {
                        return String.fromCharCode(parseInt(grp, 16));
                    });
                    setPreviewContent(decodedContent);
                } else {
                    setPreviewContent('未找到预览内容');
                }
            } else {
                setPreviewContent('加载预览内容失败');
            }
        } catch (error) {
            console.error('预览视频文件出错:', error);
            setPreviewContent(`预览加载出错: ${error.message}`);
        }
    };

    const closePreview = () => {
        setIsPreviewOpen(false);
        setPreviewFile(null);
        setPreviewContent('');
        document.body.style.overflow = 'auto';
    };

    return (
        <div className={`video-processor ${isPreviewOpen ? 'preview-open' : ''}`}>
            <h1>视频转文字处理 - RAG 知识库制作</h1>

            <div className="upload-section">
                <input
                    type="file"
                    accept=".mp4,.avi,.mov,.mkv,.wmv,.flv"
                    multiple
                    onChange={handleVideoFileChange}
                    ref={videoFileInputRef}
                />

                {videoFiles && videoFiles.length > 0 && (
                    <div className="selected-file-info">
                        <h4>已选择的文件：</h4>
                        {Array.from(videoFiles).map((file, index) => (
                            <div key={index} className="file-info-item">
                                <span className="file-name">{file.name}</span>
                                <span className="file-size">
                                    ({(file.size / 1024 / 1024).toFixed(1)}MB)
                                </span>
                            </div>
                        ))}
                    </div>
                )}

                <div className="supported-formats">
                    <p>支持的视频格式：</p>
                    <div className="format-tags">
                        <span className="format-tag">MP4</span>
                        <span className="format-tag">AVI</span>
                        <span className="format-tag">MOV</span>
                        <span className="format-tag">MKV</span>
                        <span className="format-tag">WMV</span>
                        <span className="format-tag">FLV</span>
                    </div>
                </div>

                <button
                    onClick={isVideoUploading ? handleVideoCancel : handleVideoUpload}
                >
                    {videoButtonText}
                </button>
            </div>

            {isVideoUploading && (
                <div className="progress-section">
                    <div className="status-text">
                        <p>当前状态: {videoProcessingStatus.status}</p>
                        {videoProcessingStatus.currentFile && (
                            <p>正在处理: {videoProcessingStatus.currentFile}</p>
                        )}
                    </div>
                </div>
            )}

            {!isVideoUploading && parsedVideoFiles.length > 0 && (
                <div className="progress-section">
                    <h3>批量下载所有视频文件 (ZIP)</h3>
                    <button
                        onClick={handleVideoBatchDownload}
                        className="batch-download-button"
                    >
                        批量下载所有视频文件(ZIP)
                    </button>
                </div>
            )}

            {parsedVideoFiles.length > 0 && (
                <div className="files-list">
                    <h2>已处理的视频文件</h2>
                    <ul>
                        {parsedVideoFiles.map((file, index) => (
                            <li key={index}>
                                <span className="file-name">{file}</span>
                                <div className="file-actions">
                                    <button onClick={() => handleVideoDelete(file)}>删除</button>
                                    <button onClick={() => handleVideoDownload(file)}>下载</button>
                                    <button onClick={() => handleVideoPreview(file)}>预览</button>
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
                        <div className="preview-text-content">
                            <pre style={{
                                whiteSpace: 'pre-wrap',
                                wordWrap: 'break-word',
                                padding: '1rem',
                                margin: 0,
                                fontFamily: 'monospace',
                                fontSize: '14px',
                                lineHeight: '1.5',
                                color: '#333',
                                backgroundColor: '#f8fafc',
                                height: '100%',
                                overflow: 'auto'
                            }}>
                                {previewContent}
                            </pre>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default VideoProcessor;
