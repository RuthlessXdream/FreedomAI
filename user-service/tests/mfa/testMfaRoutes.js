/**
 * 简化的MFA测试脚本
 */
const axios = require('axios');

// 设置axios默认超时时间
axios.defaults.timeout = 30000; // 增加到30秒，防止网络问题导致的超时

// 尝试不同的API基础URL
const BASE_URL = 'http://localhost:3002';
const API_URLS = [
  `${BASE_URL}/api`,  // 带/api前缀
  BASE_URL,           // 不带前缀
  `${BASE_URL}/auth`  // 直接使用/auth前缀
];

// 使用测试账户凭据
const testUser = {
  email: 'testuser123@example.com',
  password: 'Password123'
};

// 使用前一次测试中成功登录后获取的令牌
// 这个令牌可能已过期，测试时会先尝试登录获取新令牌
let accessToken = null;
let refreshToken = null;

// 获取新的访问令牌
async function getNewToken() {
  try {
    console.log('尝试登录获取新的访问令牌...');
    console.log(`请求URL: http://localhost:3002/api/auth/login`);
    console.log(`请求数据: ${JSON.stringify(testUser)}`);
    
    const response = await axios.post(`http://localhost:3002/api/auth/login`, testUser);
    console.log('登录响应状态码:', response.status);
    
    if (response.data && response.data.token) {
      accessToken = response.data.token;
      refreshToken = response.data.refreshToken;
      console.log('登录成功，获取了新令牌');
      console.log('令牌前缀:', accessToken.substring(0, 15) + '...');
      return true;
    } else {
      console.log('登录响应中没有令牌:', JSON.stringify(response.data, null, 2));
      return false;
    }
  } catch (error) {
    console.error('登录失败，无法获取新令牌:', error.message);
    if (error.response) {
      console.error('错误状态码:', error.response.status);
      console.error('错误响应数据:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('未收到服务器响应，可能服务未启动或网络问题');
    }
    return false;
  }
}

// 测试指定API URL的MFA切换功能
async function testToggleMfa(apiUrl) {
  // 如果没有有效的访问令牌，尝试获取新的
  if (!accessToken) {
    const success = await getNewToken();
    if (!success) {
      console.error('未能获取有效令牌，无法测试MFA功能');
      return false;
    }
  }

  console.log(`\n测试 MFA toggle 路由 (基础URL: ${apiUrl})...`);
  console.log(`将向 ${apiUrl}/auth/toggle-mfa 发送请求`);
  
  const config = {
    headers: { 
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  };
  
  console.log('使用令牌:', accessToken ? (accessToken.substring(0, 15) + '...') : 'null');
  console.log('请求头:', JSON.stringify(config.headers));
  console.log('请求体: {} (空对象)');
  
  try {
    // 根据控制器实现，这里应该使用空对象作为请求体
    // 控制器会自动切换isTwoFactorEnabled状态
    const response = await axios.post(`${apiUrl}/auth/toggle-mfa`, {}, config);
    console.log('MFA切换成功:');
    console.log('状态码:', response.status);
    console.log('响应数据:', JSON.stringify(response.data, null, 2));
    return true;
  } catch (error) {
    console.error('MFA切换错误:');
    
    if (error.response) {
      // 服务器返回错误状态码
      console.error(`状态码: ${error.response.status}`);
      console.error('响应数据:', JSON.stringify(error.response.data, null, 2));
      return false;
    } else if (error.request) {
      // 请求发送但没有收到响应
      console.error('未收到响应，可能是超时或服务器未启动');
      console.error('请求详情:', error.request._header || '无请求头信息');
      return false;
    } else {
      // 请求设置出错
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
  
  // 如果没有登录，先尝试登录获取令牌
  if (!accessToken) {
    await getNewToken();
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
    { path: '/login', method: 'post', data: testUser },
    { path: '/register', method: 'post', data: { username: 'testuser_' + Date.now(), email: testUser.email, password: testUser.password } },
    { path: '/refresh-token', method: 'post', data: { refreshToken: refreshToken || 'dummy-token' } },
    { path: '/logout', method: 'post', data: {}, requireAuth: true },
    { path: '/toggle-mfa', method: 'post', data: {}, requireAuth: true }
  ];
  
  for (const apiUrl of API_URLS) {
    console.log(`\n使用API URL: ${apiUrl}`);
    
    for (const route of routes) {
      const fullPath = `${apiUrl}${authPrefix}${route.path}`;
      try {
        console.log(`测试: ${route.method.toUpperCase()} ${fullPath}`);
        
        // 如果路由需要授权且我们没有访问令牌，先尝试获取新令牌
        if (route.requireAuth && !accessToken) {
          const tokenSuccess = await getNewToken();
          if (!tokenSuccess) {
            console.log(`  跳过此路由，因为无法获取访问令牌 ×`);
            continue;
          }
        }
        
        const config = {};
        if (route.requireAuth) {
          config.headers = { 
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          };
        }
        
        let response;
        if (route.method === 'get') {
          response = await axios.get(fullPath, config);
        } else {
          response = await axios.post(fullPath, route.data || {}, config);
        }
        
        console.log(`  成功 ✓ (${response.status})`);
        
        // 如果是刷新令牌API，更新我们的令牌
        if (route.path === '/refresh-token' && response.data.token) {
          accessToken = response.data.token;
          refreshToken = response.data.refreshToken || refreshToken;
          console.log('  令牌已更新');
        }
      } catch (error) {
        if (error.response) {
          if (error.response.status !== 404) {
            console.log(`  路由可用 ✓ (状态码: ${error.response.status})`);
            console.log(`  错误信息: ${JSON.stringify(error.response.data)}`);
            
            // 如果是401错误，可能是令牌过期，尝试刷新令牌
            if (error.response.status === 401 && route.requireAuth) {
              console.log('  令牌可能已过期，尝试刷新...');
              const tokenSuccess = await getNewToken();
              if (tokenSuccess) {
                console.log('  令牌已刷新，请重试此路由');
              }
            }
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