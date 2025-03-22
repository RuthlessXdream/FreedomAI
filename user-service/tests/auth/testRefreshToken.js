/**
 * 测试刷新令牌功能
 */
const axios = require('axios');
const { MongoClient } = require('mongodb');

// 配置
const API_URL = 'http://localhost:3002/api';
const MONGO_URI = 'mongodb://localhost:27017/user-service';

// 测试用户数据
const TEST_USER = {
  username: `refresh_${Date.now()}`,
  email: `refresh${Date.now()}@example.com`,
  password: 'Password123!'
};

// 存储测试数据
const testData = {
  userId: null,
  token: null,
  refreshToken: null
};

// 初始化数据库连接
async function connectToDb() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  console.log('数据库连接成功');
  return client;
}

// 测试过程
async function testRefreshTokenFlow() {
  let client;
  
  try {
    console.log('开始刷新令牌测试流程');
    console.log(`测试用户: ${TEST_USER.email}`);
    
    // 连接数据库
    client = await connectToDb();
    const db = client.db();
    
    // 1. 注册用户
    console.log('\n1. 注册新用户');
    const registerResponse = await axios.post(`${API_URL}/auth/register`, TEST_USER);
    console.log(`注册状态: ${registerResponse.status}`);
    console.log(`注册响应: ${JSON.stringify(registerResponse.data)}`);
    
    testData.userId = registerResponse.data.userId;
    
    // 2. 验证邮箱 (使用registerResponse中返回的验证码)
    console.log('\n2. 验证用户邮箱');
    const verificationCode = registerResponse.data.verificationCode;
    const verifyResponse = await axios.post(`${API_URL}/auth/verify-email`, {
      email: TEST_USER.email,
      verificationCode
    });
    console.log(`验证状态: ${verifyResponse.status}`);
    console.log(`验证响应: ${JSON.stringify(verifyResponse.data)}`);
    
    // 3. 登录用户
    console.log('\n3. 登录用户');
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      email: TEST_USER.email,
      password: TEST_USER.password
    });
    console.log(`登录状态: ${loginResponse.status}`);
    console.log(`登录响应用户: ${loginResponse.data.user.username}`);
    
    testData.token = loginResponse.data.token;
    testData.refreshToken = loginResponse.data.refreshToken;
    
    // 从数据库查询用户
    const user = await db.collection('users').findOne({ email: TEST_USER.email });
    console.log('\n用户数据:');
    console.log(` - 用户ID: ${user._id}`);
    console.log(` - 刷新令牌: ${user.refreshToken ? (user.refreshToken.substring(0, 15) + '...') : '无'}`);
    
    // 4. 尝试刷新令牌
    console.log('\n4. 刷新令牌');
    const refreshResponse = await axios.post(`${API_URL}/auth/refresh-token`, {
      refreshToken: testData.refreshToken
    });
    
    console.log(`刷新令牌状态: ${refreshResponse.status}`);
    console.log(`刷新令牌响应: ${JSON.stringify(refreshResponse.data)}`);
    
    // 获取新令牌
    const newToken = refreshResponse.data.token;
    console.log(`\n旧令牌: ${testData.token.substring(0, 15)}...`);
    console.log(`新令牌: ${newToken.substring(0, 15)}...`);
    
    // 5. 使用新令牌访问受保护的路由
    console.log('\n5. 使用新令牌访问受保护的路由');
    try {
      const protectedResponse = await axios.get(`${API_URL}/users/profile`, {
        headers: {
          Authorization: `Bearer ${newToken}`
        }
      });
      console.log(`访问受保护路由状态: ${protectedResponse.status}`);
      console.log('访问成功，令牌有效');
    } catch (error) {
      console.error(`访问失败: ${error.message}`);
      if (error.response) {
        console.error(`错误状态: ${error.response.status}`);
        console.error(`错误信息: ${JSON.stringify(error.response.data)}`);
      }
    }
    
    console.log('\n刷新令牌测试完成');
  } catch (error) {
    console.error('测试过程中发生错误:');
    if (error.response) {
      console.error(`状态码: ${error.response.status}`);
      console.error(`错误信息: ${JSON.stringify(error.response.data)}`);
    } else {
      console.error(error.message);
    }
  } finally {
    if (client) {
      await client.close();
      console.log('数据库连接已关闭');
    }
  }
}

// 执行测试
testRefreshTokenFlow().catch(console.error); 