// API配置测试工具
// 用于验证API配置是否正常工作

import apiConfigManager from './apiConfig';

/**
 * 测试API配置功能
 */
export const testApiConfig = async () => {
    console.log('🔍 开始测试API配置...');
    
    try {
        // 1. 测试自动检测
        console.log('\n1. 测试自动检测API服务器...');
        const detectedUrl = await apiConfigManager.autoDetectApiServer();
        console.log('✅ 检测到的API URL:', detectedUrl);
        console.log('✅ 可用服务器列表:', apiConfigManager.availableHosts);
        
        // 2. 测试获取API URL
        console.log('\n2. 测试获取API URL...');
        const apiUrl = await apiConfigManager.getApiUrl();
        console.log('✅ 当前API URL:', apiUrl);
        
        // 3. 测试健康检查
        console.log('\n3. 测试健康检查...');
        if (apiConfigManager.availableHosts.length > 0) {
            const firstServer = apiConfigManager.availableHosts[0];
            const [host, port] = firstServer.url.replace('http://', '').split(':');
            const isHealthy = await apiConfigManager.checkApiHealth(host, port);
            console.log(`✅ 服务器 ${firstServer.url} 健康状态:`, isHealthy ? '正常' : '异常');
        }
        
        // 4. 测试故障转移（如果有多个服务器）
        if (apiConfigManager.availableHosts.length > 1) {
            console.log('\n4. 测试故障转移...');
            const originalUrl = apiConfigManager.currentApiUrl;
            await apiConfigManager.failover();
            const newUrl = apiConfigManager.currentApiUrl;
            console.log('✅ 原URL:', originalUrl);
            console.log('✅ 新URL:', newUrl);
        }
        
        console.log('\n🎉 API配置测试完成！');
        return {
            success: true,
            apiUrl: detectedUrl,
            availableServers: apiConfigManager.availableHosts.length
        };
        
    } catch (error) {
        console.error('❌ API配置测试失败:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

/**
 * 测试网络连接
 */
export const testNetworkConnectivity = async () => {
    console.log('🌐 测试网络连接...');
    
    const testUrls = [
        'https://www.google.com',
        'https://www.baidu.com',
        'https://httpbin.org/get'
    ];
    
    const results = [];
    
    for (const url of testUrls) {
        try {
            const startTime = Date.now();
            const response = await fetch(url, { 
                method: 'HEAD',
                mode: 'no-cors',
                cache: 'no-cache'
            });
            const endTime = Date.now();
            
            results.push({
                url,
                success: true,
                responseTime: endTime - startTime
            });
            
            console.log(`✅ ${url} - 响应时间: ${endTime - startTime}ms`);
        } catch (error) {
            results.push({
                url,
                success: false,
                error: error.message
            });
            
            console.log(`❌ ${url} - 连接失败: ${error.message}`);
        }
    }
    
    return results;
};

/**
 * 获取系统信息
 */
export const getSystemInfo = () => {
    const info = {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        cookieEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine,
        hostname: window.location.hostname,
        port: window.location.port,
        protocol: window.location.protocol,
        href: window.location.href,
        nodeEnv: process.env.NODE_ENV,
        apiHost: process.env.REACT_APP_API_HOST,
        apiPort: process.env.REACT_APP_API_PORT,
        devIPs: process.env.REACT_APP_DEV_IPS
    };
    
    console.log('💻 系统信息:', info);
    return info;
};

/**
 * 运行完整的诊断测试
 */
export const runDiagnostics = async () => {
    console.log('🔧 开始运行完整诊断...');
    
    const results = {
        timestamp: new Date().toISOString(),
        systemInfo: getSystemInfo(),
        networkTest: await testNetworkConnectivity(),
        apiConfigTest: await testApiConfig()
    };
    
    console.log('📊 诊断结果:', results);
    return results;
};

// 在开发环境中自动运行测试
if (process.env.NODE_ENV === 'development') {
    // 延迟执行，确保页面加载完成
    setTimeout(() => {
        console.log('🚀 开发环境自动测试API配置...');
        testApiConfig().catch(console.error);
    }, 2000);
}
