import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Home.css';

function Home() {
    const navigate = useNavigate();

    const features = [
        { id: 1, name: 'PDF文件上传解析', path: '/pdf-upload' },
        { id: 2, name: '多格式文档解读', path: '/pdf-reader' },
        { id: 3, name: '视频转文字处理', path: '/video_voice' },
        { id: 4, name: '功能四', path: '/feature4' },
        { id: 5, name: '功能五', path: '/feature5' },
        { id: 6, name: '功能六', path: '/feature6' }
    ];

    return (
        <div className="home">
            <div className="home-header">
                <h1>AI Tech研习社功能集</h1>
                <p>选择需要使用的功能</p>
            </div>
            <div className="features-grid">
                {features.map((feature) => (
                    <button
                        key={feature.id}
                        className="feature-button"
                        onClick={() => navigate(feature.path)}
                    >
                        <span className="feature-number">功能 {feature.id}</span>
                        <span className="feature-name">{feature.name}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}

export default Home; 