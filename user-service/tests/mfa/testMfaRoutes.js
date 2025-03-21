/**
 * 简化的MFA测试脚本
 */
const axios = require('axios');

// 尝试不同的API基础URL
const BASE_URL = 'http://localhost:3001';
const API_URLS = [
  `${BASE_URL}/api`,  // 带/api前缀
  BASE_URL,           // 不带前缀
  `${BASE_URL}/auth`  // 直接使用/auth前缀
];

// 使用前一次测试中成功登录后获取的令牌
// 请将下面的令牌替换为您的最新的访问令牌
const accessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY3ZGQ3OTZmZGNlNGUzODZkNWNlMmZiMCIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzQyNTY3NzkyLCJleHAiOjE3NDI2NTQxOTJ9.Qg_HzE9I4stYRb7CYgXGf5SSZVkuQl36TKAV5u_7un0';

// 测试指定API URL的MFA切换功能
async function testToggleMfa(apiUrl) {
  console.log(`\n测试 MFA toggle 路由 (基础URL: ${apiUrl})...`);
  console.log(`将向 ${apiUrl}/auth/toggle-mfa 发送请求`);
  
  const config = {
    headers: { 
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  };
  
  try {
    const response = await axios.post(`${apiUrl}/auth/toggle-mfa`, { enable: true }, config);
    console.log('成功:', response.data);
    return true;
  } catch (error) {
    console.error('错误:');
    if (error.response) {
      console.error(`状态码: ${error.response.status}`);
      console.error(`响应数据: ${JSON.stringify(error.response.data, null, 2)}`);
      return false;
    } else if (error.request) {
      console.error('没有收到响应');
      return false;
    } else {
      console.error('请求错误:', error.message);
      return false;
    }
  }
}

// 测试URL和路由组合
async function testRoutes() {
  // 测试健康检查端点
  try {
    console.log('\n测试健康检查端点...');
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log('健康检查成功:', healthResponse.data);
  } catch (error) {
    console.error('健康检查失败:', error.message);
  }
  
  // 测试所有MFA路由组合
  for (const apiUrl of API_URLS) {
    const success = await testToggleMfa(apiUrl);
    if (success) {
      console.log(`找到有效的API路径: ${apiUrl}/auth/toggle-mfa`);
      break;
    }
  }
  
  // 测试其他路由
  console.log('\n测试其他路由...');
  const authPrefix = '/auth';
  const routes = [
    { path: '/login', method: 'post', data: { email: 'test@example.com', password: 'password' } },
    { path: '/register', method: 'post', data: { username: 'testuser', email: 'test123@example.com', password: 'password123' } },
    { path: '/refresh-token', method: 'post', data: { refreshToken: 'dummy-token' } },
    { path: '/logout', method: 'post', data: {}, requireAuth: true }
  ];
  
  for (const apiUrl of API_URLS) {
    console.log(`\n使用API URL: ${apiUrl}`);
    
    for (const route of routes) {
      const fullPath = `${apiUrl}${authPrefix}${route.path}`;
      try {
        console.log(`测试: ${route.method.toUpperCase()} ${fullPath}`);
        
        const config = {};
        if (route.requireAuth) {
          config.headers = { Authorization: `Bearer ${accessToken}` };
        }
        
        let response;
        if (route.method === 'get') {
          response = await axios.get(fullPath, config);
        } else {
          response = await axios.post(fullPath, route.data || {}, config);
        }
        
        console.log(`  成功 ✓ (${response.status})`);
      } catch (error) {
        if (error.response) {
          if (error.response.status !== 404) {
            console.log(`  路由可用 ✓ (状态码: ${error.response.status})`);
          } else {
            console.log(`  路由不存在 × (404 Not Found)`);
          }
        } else {
          console.log(`  请求失败 × (${error.message})`);
        }
      }
    }
  }
}

// 执行测试
(async () => {
  try {
    console.log('开始路由测试...');
    await testRoutes();
    console.log('\n测试完成');
  } catch (err) {
    console.error('未捕获错误:', err);
  }
})(); 