import React, { useState, useEffect } from 'react';
import './AiNews.css';
import { API_BASE_URL } from '../config';

function AiNews() {
    const [pdfFiles, setPdfFiles] = useState([]);
    const [selectedPdf, setSelectedPdf] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortOrder, setSortOrder] = useState('name-asc'); // name-asc, name-desc, date-asc, date-desc

    useEffect(() => {
        fetchPdfFiles();
    }, []);

    const fetchPdfFiles = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE_URL}/api/ai-news-files`);
            if (!response.ok) {
                throw new Error('Failed to fetch files');
            }
            const data = await response.json();
            setPdfFiles(data);
            if (data.length > 0) {
                setSelectedPdf(data[0]); // 默认选中第一个文件
            }
        } catch (err) {
            setError('无法加载文件列表，请稍后重试');
            console.error('Error fetching files:', err);
        } finally {
            setLoading(false);
        }
    };

    const handlePdfClick = (pdf) => {
        setSelectedPdf(pdf);
    };

    const handleSearch = (event) => {
        setSearchTerm(event.target.value);
    };

    const handleSort = (event) => {
        setSortOrder(event.target.value);
    };

    const filteredAndSortedFiles = () => {
        let filtered = pdfFiles.filter(file =>
            file.name.toLowerCase().includes(searchTerm.toLowerCase())
        );

        switch (sortOrder) {
            case 'name-asc':
                return filtered.sort((a, b) => a.name.localeCompare(b.name));
            case 'name-desc':
                return filtered.sort((a, b) => b.name.localeCompare(a.name));
            case 'date-asc':
                return filtered.sort((a, b) => a.id - b.id);
            case 'date-desc':
                return filtered.sort((a, b) => b.id - a.id);
            default:
                return filtered;
        }
    };

    if (loading) {
        return (
            <div className="ai-news-container">
                <div className="loading-message">加载中...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="ai-news-container">
                <div className="error-message">{error}</div>
            </div>
        );
    }

    return (
        <div className="ai-news-container">
            <div className="ai-news-layout">
                {/* 左侧文件列表 */}
                <div className="file-list-section">
                    <div className="file-list-header">
                        <h2>文档列表</h2>
                        <div className="file-controls">
                            <input
                                type="text"
                                placeholder="搜索文件..."
                                value={searchTerm}
                                onChange={handleSearch}
                                className="search-input"
                            />
                            <select
                                value={sortOrder}
                                onChange={handleSort}
                                className="sort-select"
                            >
                                <option value="name-asc">名称 (A-Z)</option>
                                <option value="name-desc">名称 (Z-A)</option>
                                <option value="date-asc">添加时间 (旧-新)</option>
                                <option value="date-desc">添加时间 (新-旧)</option>
                            </select>
                        </div>
                    </div>

                    {pdfFiles.length === 0 ? (
                        <div className="no-files-message">暂无文档</div>
                    ) : (
                        <div className="pdf-list">
                            {filteredAndSortedFiles().map((pdf) => (
                                <div
                                    key={pdf.id}
                                    className={`pdf-item ${selectedPdf?.id === pdf.id ? 'selected' : ''}`}
                                    onClick={() => handlePdfClick(pdf)}
                                >
                                    <div className="pdf-icon">
                                        <i className="far fa-file-pdf"></i>
                                    </div>
                                    <div className="pdf-name">{pdf.name}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* 右侧预览区域 */}
                <div className="preview-section">
                    {selectedPdf ? (
                        <>
                            <div className="preview-header">
                                <h2>{selectedPdf.name}</h2>
                            </div>
                            <div className="preview-content">
                                <iframe
                                    src={`${API_BASE_URL}${selectedPdf.path}`}
                                    title="PDF Preview"
                                    width="100%"
                                    height="100%"
                                />
                            </div>
                        </>
                    ) : (
                        <div className="no-preview-message">
                            请选择要预览的文档
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default AiNews; 