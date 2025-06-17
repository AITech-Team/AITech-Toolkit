// React Hook for API configuration management
import { useState, useEffect, useCallback } from 'react';
import apiConfigManager from '../utils/apiConfig';

/**
 * 用于管理API配置的React Hook
 * @param {Object} options 配置选项
 * @param {boolean} options.autoDetect 是否自动检测API服务器
 * @param {boolean} options.enableHealthCheck 是否启用健康检查
 * @param {number} options.healthCheckInterval 健康检查间隔（毫秒）
 */
export const useApiConfig = (options = {}) => {
    const {
        autoDetect = true,
        enableHealthCheck = true,
        healthCheckInterval = 30000
    } = options;

    const [apiUrl, setApiUrl] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [availableServers, setAvailableServers] = useState([]);

    // 初始化API配置
    const initializeApi = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            
            if (autoDetect) {
                const detectedUrl = await apiConfigManager.autoDetectApiServer();
                setApiUrl(detectedUrl);
                setAvailableServers(apiConfigManager.availableHosts);
            } else {
                const url = await apiConfigManager.getApiUrl();
                setApiUrl(url);
            }
        } catch (err) {
            setError(err.message);
            console.error('API配置初始化失败:', err);
        } finally {
            setIsLoading(false);
        }
    }, [autoDetect]);

    // 手动设置API URL
    const updateApiUrl = useCallback((newUrl) => {
        apiConfigManager.setApiUrl(newUrl);
        setApiUrl(newUrl);
    }, []);

    // 故障转移
    const failover = useCallback(async () => {
        try {
            setIsLoading(true);
            const newUrl = await apiConfigManager.failover();
            setApiUrl(newUrl);
            setAvailableServers(apiConfigManager.availableHosts);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // 重新检测API服务器
    const redetect = useCallback(async () => {
        await initializeApi();
    }, [initializeApi]);

    useEffect(() => {
        initializeApi();
    }, [initializeApi]);

    useEffect(() => {
        if (enableHealthCheck && apiUrl) {
            apiConfigManager.startHealthCheck(healthCheckInterval);
            
            return () => {
                apiConfigManager.stopHealthCheck();
            };
        }
    }, [enableHealthCheck, healthCheckInterval, apiUrl]);

    return {
        apiUrl,
        isLoading,
        error,
        availableServers,
        updateApiUrl,
        failover,
        redetect,
        isInitialized: !isLoading && !error && apiUrl
    };
};

/**
 * 简化版Hook，只获取API URL
 */
export const useApiUrl = () => {
    const [apiUrl, setApiUrl] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const getUrl = async () => {
            try {
                const url = await apiConfigManager.getApiUrl();
                setApiUrl(url);
            } catch (error) {
                console.error('获取API URL失败:', error);
            } finally {
                setIsLoading(false);
            }
        };

        getUrl();
    }, []);

    return { apiUrl, isLoading };
};
