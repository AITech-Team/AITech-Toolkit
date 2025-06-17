// API配置管理面板组件
import React, { useState } from 'react';
import { Card, Button, Input, Alert, Spin, Tag, Space, Divider } from 'antd';
import { ReloadOutlined, CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { useApiConfig } from '../hooks/useApiConfig';

const ApiConfigPanel = () => {
    const {
        apiUrl,
        isLoading,
        error,
        availableServers,
        updateApiUrl,
        failover,
        redetect,
        isInitialized
    } = useApiConfig();

    const [customUrl, setCustomUrl] = useState('');

    const handleUpdateUrl = () => {
        if (customUrl.trim()) {
            updateApiUrl(customUrl.trim());
            setCustomUrl('');
        }
    };

    const handleFailover = async () => {
        await failover();
    };

    const handleRedetect = async () => {
        await redetect();
    };

    return (
        <Card title="API服务器配置" style={{ margin: '20px 0' }}>
            {isLoading && (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                    <Spin size="large" />
                    <div style={{ marginTop: '10px' }}>正在检测API服务器...</div>
                </div>
            )}

            {error && (
                <Alert
                    message="配置错误"
                    description={error}
                    type="error"
                    showIcon
                    style={{ marginBottom: '16px' }}
                />
            )}

            {isInitialized && (
                <>
                    <div style={{ marginBottom: '16px' }}>
                        <strong>当前API服务器：</strong>
                        <Tag color="green" icon={<CheckCircleOutlined />} style={{ marginLeft: '8px' }}>
                            {apiUrl}
                        </Tag>
                    </div>

                    {availableServers.length > 0 && (
                        <>
                            <div style={{ marginBottom: '16px' }}>
                                <strong>可用服务器列表：</strong>
                                <div style={{ marginTop: '8px' }}>
                                    {availableServers.map((server, index) => (
                                        <Tag
                                            key={server.url}
                                            color={server.url === apiUrl ? 'green' : 'blue'}
                                            style={{ marginBottom: '4px' }}
                                        >
                                            {server.url}
                                            {server.url === apiUrl && ' (当前)'}
                                        </Tag>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}

                    <Divider />

                    <div style={{ marginBottom: '16px' }}>
                        <strong>手动设置API地址：</strong>
                        <Space style={{ marginTop: '8px', width: '100%' }}>
                            <Input
                                placeholder="例如: http://192.168.1.100:8000"
                                value={customUrl}
                                onChange={(e) => setCustomUrl(e.target.value)}
                                style={{ width: '300px' }}
                                onPressEnter={handleUpdateUrl}
                            />
                            <Button type="primary" onClick={handleUpdateUrl}>
                                更新
                            </Button>
                        </Space>
                    </div>

                    <Space>
                        <Button 
                            icon={<ReloadOutlined />} 
                            onClick={handleRedetect}
                            loading={isLoading}
                        >
                            重新检测
                        </Button>
                        
                        {availableServers.length > 1 && (
                            <Button 
                                icon={<ExclamationCircleOutlined />} 
                                onClick={handleFailover}
                                loading={isLoading}
                            >
                                故障转移
                            </Button>
                        )}
                    </Space>

                    <Divider />

                    <Alert
                        message="使用说明"
                        description={
                            <ul style={{ marginBottom: 0, paddingLeft: '20px' }}>
                                <li>系统会自动检测可用的API服务器</li>
                                <li>支持环境变量配置（REACT_APP_API_HOST）</li>
                                <li>自动使用当前访问的主机IP</li>
                                <li>支持故障转移和健康检查</li>
                                <li>可以手动设置自定义API地址</li>
                            </ul>
                        }
                        type="info"
                        showIcon
                    />
                </>
            )}
        </Card>
    );
};

export default ApiConfigPanel;
