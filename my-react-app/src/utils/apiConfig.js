// 高级API配置管理器
// 支持自动IP检测、健康检查、故障转移等功能

import axios from 'axios';

/**
 * API配置管理类
 */
class ApiConfigManager {
    constructor() {
        this.currentApiUrl = null;
        this.availableHosts = [];
        this.healthCheckInterval = null;
        this.isInitialized = false;
    }

    /**
     * 获取可能的主机IP列表
     */
    getPossibleHosts() {
        const hosts = [];
        
        // 1. 环境变量指定的主机
        if (process.env.REACT_APP_API_HOST) {
            hosts.push(process.env.REACT_APP_API_HOST);
        }
        
        // 2. 当前访问的主机
        const currentHost = window.location.hostname;
        if (currentHost !== 'localhost' && currentHost !== '127.0.0.1') {
            hosts.push(currentHost);
        }
        
        // 3. 开发环境的备用IP列表
        if (process.env.REACT_APP_DEV_IPS) {
            const devIPs = process.env.REACT_APP_DEV_IPS.split(',').map(ip => ip.trim());
            hosts.push(...devIPs);
        }
        
        // 4. 常见的局域网IP段
        const commonIPs = [
            '10.255.11.3',
            '192.168.1.100',
            '192.168.0.100',
            '172.16.0.100'
        ];
        hosts.push(...commonIPs);
        
        // 去重
        return [...new Set(hosts)];
    }

    /**
     * 检查API服务器是否可用
     */
    async checkApiHealth(host, port = '8000', timeout = 3000) {
        const url = `http://${host}:${port}`;
        try {
            const response = await axios.get(`${url}/health`, {
                timeout,
                headers: {
                    'Cache-Control': 'no-cache'
                }
            });
            return response.status === 200;
        } catch (error) {
            // 如果没有/health端点，尝试其他常见端点
            try {
                await axios.get(`${url}/api/status`, { timeout: timeout / 2 });
                return true;
            } catch (secondError) {
                try {
                    await axios.get(url, { timeout: timeout / 3 });
                    return true;
                } catch (thirdError) {
                    return false;
                }
            }
        }
    }

    /**
     * 自动检测可用的API服务器
     */
    async autoDetectApiServer() {
        const hosts = this.getPossibleHosts();
        const port = process.env.REACT_APP_API_PORT || '8000';
        const timeout = parseInt(process.env.REACT_APP_NETWORK_TIMEOUT) || 3000;
        
        console.log('正在检测可用的API服务器...', hosts);
        
        // 并行检查所有主机
        const healthChecks = hosts.map(async (host) => {
            const isHealthy = await this.checkApiHealth(host, port, timeout);
            return { host, port, isHealthy, url: `http://${host}:${port}` };
        });
        
        const results = await Promise.all(healthChecks);
        this.availableHosts = results.filter(result => result.isHealthy);
        
        if (this.availableHosts.length > 0) {
            this.currentApiUrl = this.availableHosts[0].url;
            console.log('检测到可用的API服务器:', this.currentApiUrl);
            console.log('所有可用服务器:', this.availableHosts.map(h => h.url));
        } else {
            // 如果没有检测到可用服务器，使用第一个主机作为默认值
            const defaultHost = hosts[0] || '10.255.11.3';
            this.currentApiUrl = `http://${defaultHost}:${port}`;
            console.warn('未检测到可用的API服务器，使用默认配置:', this.currentApiUrl);
        }
        
        this.isInitialized = true;
        return this.currentApiUrl;
    }

    /**
     * 获取当前API URL
     */
    async getApiUrl() {
        if (!this.isInitialized) {
            await this.autoDetectApiServer();
        }
        return this.currentApiUrl;
    }

    /**
     * 故障转移到下一个可用服务器
     */
    async failover() {
        if (this.availableHosts.length > 1) {
            // 移除当前失败的服务器
            this.availableHosts = this.availableHosts.filter(
                host => host.url !== this.currentApiUrl
            );
            
            if (this.availableHosts.length > 0) {
                this.currentApiUrl = this.availableHosts[0].url;
                console.log('故障转移到:', this.currentApiUrl);
                return this.currentApiUrl;
            }
        }
        
        // 如果没有备用服务器，重新检测
        console.log('没有备用服务器，重新检测...');
        return await this.autoDetectApiServer();
    }

    /**
     * 启动定期健康检查
     */
    startHealthCheck(interval = 30000) {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
        }
        
        this.healthCheckInterval = setInterval(async () => {
            if (this.currentApiUrl) {
                const [host, port] = this.currentApiUrl.replace('http://', '').split(':');
                const isHealthy = await this.checkApiHealth(host, port, 2000);
                
                if (!isHealthy) {
                    console.warn('当前API服务器不可用，尝试故障转移...');
                    await this.failover();
                }
            }
        }, interval);
    }

    /**
     * 停止健康检查
     */
    stopHealthCheck() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
        }
    }

    /**
     * 手动设置API URL
     */
    setApiUrl(url) {
        this.currentApiUrl = url;
        this.isInitialized = true;
    }
}

// 创建全局实例
const apiConfigManager = new ApiConfigManager();

export default apiConfigManager;

// 导出便捷函数
export const getApiUrl = () => apiConfigManager.getApiUrl();
export const setApiUrl = (url) => apiConfigManager.setApiUrl(url);
export const startHealthCheck = (interval) => apiConfigManager.startHealthCheck(interval);
export const stopHealthCheck = () => apiConfigManager.stopHealthCheck();
