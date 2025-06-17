// 配置服务器地址 - 自动获取本机IP地址
// 支持多种获取IP的方式，确保在不同环境下都能正常工作

/**
 * 获取当前访问的主机IP地址
 * 这种方法最简单，直接使用浏览器当前访问的主机地址
 */
const getCurrentHostIP = () => {
    return window.location.hostname;
};

/**
 * 尝试通过WebRTC获取本地IP地址
 * 注意：某些浏览器可能会阻止此方法
 */
const getLocalIPByWebRTC = () => {
    return new Promise((resolve, reject) => {
        const pc = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });

        pc.createDataChannel('');
        pc.createOffer().then(offer => pc.setLocalDescription(offer));

        pc.onicecandidate = (ice) => {
            if (ice && ice.candidate && ice.candidate.candidate) {
                const candidate = ice.candidate.candidate;
                const ipMatch = candidate.match(/([0-9]{1,3}(\.[0-9]{1,3}){3})/);
                if (ipMatch) {
                    pc.close();
                    resolve(ipMatch[1]);
                }
            }
        };

        // 超时处理
        setTimeout(() => {
            pc.close();
            reject(new Error('获取IP超时'));
        }, 3000);
    });
};

/**
 * 获取API基础URL
 * 优先级：环境变量 > 当前主机IP > 默认IP
 */
const getBaseUrl = () => {
    // 1. 优先使用环境变量配置
    const envHost = process.env.REACT_APP_API_HOST;
    const envPort = process.env.REACT_APP_API_PORT || '8000';

    if (envHost) {
        return `http://${envHost}:${envPort}`;
    }

    // 2. 使用当前访问的主机IP（最常用的情况）
    const currentHost = getCurrentHostIP();

    // 如果是localhost或127.0.0.1，直接使用localhost
    if (currentHost === 'localhost' || currentHost === '127.0.0.1') {
        return `http://localhost:${envPort}`;
    }

    return `http://${currentHost}:${envPort}`;
};

// 导出API基础URL（兼容性保持）
export const API_BASE_URL = getBaseUrl();

// 导出获取IP的工具函数，供其他组件使用
export const getLocalIP = async () => {
    try {
        // 首先尝试使用当前主机IP
        const currentHost = getCurrentHostIP();
        if (currentHost !== 'localhost' && currentHost !== '127.0.0.1') {
            return currentHost;
        }

        // 如果是localhost，尝试通过WebRTC获取
        return await getLocalIPByWebRTC();
    } catch (error) {
        console.warn('无法自动获取IP地址:', error);
        return '10.255.11.3'; // 回退到默认IP
    }
};

// 动态更新API URL的函数
export const updateApiUrl = (newHost, port = '8000') => {
    // 这个函数可以用于运行时动态更新API地址
    const newUrl = `http://${newHost}:${port}`;
    // 注意：由于API_BASE_URL是常量，这里需要其他方式来更新
    // 建议在应用中使用状态管理来处理动态URL
    return newUrl;
};

console.log('当前API基础URL:', API_BASE_URL);

// ===== 新增：高级配置管理 =====
// 推荐使用新的配置管理器来获得更好的功能

/**
 * 使用新的配置管理器的示例：
 *
 * import { useApiConfig } from './hooks/useApiConfig';
 * import apiConfigManager from './utils/apiConfig';
 *
 * // 在组件中使用：
 * const { apiUrl, isLoading } = useApiConfig();
 *
 * // 或者直接获取：
 * const apiUrl = await apiConfigManager.getApiUrl();
 */

// 导出配置管理器（可选）
export { default as apiConfigManager } from './utils/apiConfig';
export { useApiConfig, useApiUrl } from './hooks/useApiConfig';