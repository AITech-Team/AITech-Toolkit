// API使用示例组件
import React, { useState, useEffect } from 'react';
import { Card, Button, Alert, Space, Divider } from 'antd';
import { useApiConfig } from '../hooks/useApiConfig';
import axios from 'axios';

const ApiExample = () => {
    const { apiUrl, isLoading, error } = useApiConfig();
    const [apiData, setApiData] = useState(null);
    const [apiError, setApiError] = useState(null);
    const [testing, setTesting] = useState(false);

    // 创建axios实例，使用动态API URL
    const createApiClient = () => {
        if (!apiUrl) return null;
        
        return axios.create({
            baseURL: apiUrl,
            timeout: 5000,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    };

    // 测试API连接
    const testApiConnection = async () => {
        if (!apiUrl) return;
        
        setTesting(true);
        setApiError(null);
        
        try {
            const apiClient = createApiClient();
            
            // 尝试多个常见的健康检查端点
            const endpoints = ['/health', '/api/health', '/status', '/api/status', '/'];
            
            let response = null;
            let successEndpoint = null;
            
            for (const endpoint of endpoints) {
                try {
                    response = await apiClient.get(endpoint);
                    successEndpoint = endpoint;
                    break;
                } catch (err) {
                    // 继续尝试下一个端点
                    continue;
                }
            }
            
            if (response) {
                setApiData({
                    status: response.status,
                    endpoint: successEndpoint,
                    data: response.data,
                    headers: response.headers,
                    timestamp: new Date().toISOString()
                });
            } else {
                throw new Error('所有端点都无法访问');
            }
            
        } catch (err) {
            setApiError(err.message);
        } finally {
            setTesting(false);
        }
    };

    // 当API URL变化时自动测试连接
    useEffect(() => {
        if (apiUrl && !isLoading) {
            testApiConnection();
        }
    }, [apiUrl, isLoading]);

    if (isLoading) {
        return (
            <Card title="API连接测试" loading={true}>
                正在检测API服务器...
            </Card>
        );
    }

    return (
        <Card title="API连接测试">
            {error && (
                <Alert
                    message="API配置错误"
                    description={error}
                    type="error"
                    showIcon
                    style={{ marginBottom: '16px' }}
                />
            )}

            <div style={{ marginBottom: '16px' }}>
                <strong>当前API地址：</strong>
                <code style={{ 
                    background: '#f5f5f5', 
                    padding: '2px 6px', 
                    borderRadius: '3px',
                    marginLeft: '8px'
                }}>
                    {apiUrl || '未配置'}
                </code>
            </div>

            <Space>
                <Button 
                    type="primary" 
                    onClick={testApiConnection}
                    loading={testing}
                    disabled={!apiUrl}
                >
                    测试连接
                </Button>
            </Space>

            <Divider />

            {apiError && (
                <Alert
                    message="连接失败"
                    description={
                        <div>
                            <p>无法连接到API服务器：{apiError}</p>
                            <p>请检查：</p>
                            <ul>
                                <li>API服务器是否正在运行</li>
                                <li>端口是否正确（默认8000）</li>
                                <li>防火墙设置</li>
                                <li>网络连接</li>
                            </ul>
                        </div>
                    }
                    type="error"
                    showIcon
                    style={{ marginBottom: '16px' }}
                />
            )}

            {apiData && (
                <Alert
                    message="连接成功"
                    description={
                        <div>
                            <p><strong>状态码：</strong>{apiData.status}</p>
                            <p><strong>成功端点：</strong>{apiData.endpoint}</p>
                            <p><strong>测试时间：</strong>{new Date(apiData.timestamp).toLocaleString()}</p>
                            {apiData.data && (
                                <details style={{ marginTop: '8px' }}>
                                    <summary style={{ cursor: 'pointer' }}>查看响应数据</summary>
                                    <pre style={{ 
                                        background: '#f5f5f5', 
                                        padding: '8px', 
                                        borderRadius: '3px',
                                        marginTop: '8px',
                                        fontSize: '12px',
                                        overflow: 'auto',
                                        maxHeight: '200px'
                                    }}>
                                        {JSON.stringify(apiData.data, null, 2)}
                                    </pre>
                                </details>
                            )}
                        </div>
                    }
                    type="success"
                    showIcon
                />
            )}

            <Divider />

            <div style={{ fontSize: '12px', color: '#666' }}>
                <p><strong>使用说明：</strong></p>
                <ul style={{ marginBottom: 0, paddingLeft: '20px' }}>
                    <li>系统会自动检测可用的API服务器</li>
                    <li>支持多种健康检查端点</li>
                    <li>可以通过环境变量配置API地址</li>
                    <li>支持故障转移和自动重连</li>
                </ul>
            </div>
        </Card>
    );
};

export default ApiExample;
