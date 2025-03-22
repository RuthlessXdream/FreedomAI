/**
 * 测试MFA登录流程
 */
const axios = require('axios');
const { MongoClient } = require('mongodb');

// API基础URL
const BASE_URL = 'http://localhost:3002';
const API_URL = `${BASE_URL}/api`;
const MONGO_URI = 'mongodb://localhost:27017/user-service';

// 要测试的用户
const testUser = {
  email: 'mfatest1742658119150@example.com',  // 使用刚刚已修复密码的用户
  password: 'Password123!'
};

// 1. 登录用户
async function loginUser() {
  console.log('\n===== 用户登录 =====');
  
  try {
    console.log('登录请求数据:', {
      email: testUser.email,
      password: testUser.password
    });
    
    const response = await axios.post(`${API_URL}/auth/login`, {
      email: testUser.email,
      password: testUser.password
    });
    
    console.log('登录响应状态码:', response.status);
    console.log('登录响应数据:', response.data);
    
    // 检查是否需要MFA验证
    if (response.data.requireMFA) {
      console.log('需要MFA验证!');
      testUser.id = response.data.userId;
      testUser.mfaCode = response.data.mfaCode;
      return { requireMFA: true, mfaCode: testUser.mfaCode };
    }
    
    // 正常登录
    testUser.token = response.data.token;
    return { success: true };
  } catch (error) {
    console.error('登录错误:');
    if (error.response) {
      console.error('状态码:', error.response.status);
      console.error('响应数据:', error.response.data);
    } else {
      console.error('错误:', error.message);
    }
    return { success: false };
  }
}

// 2. 验证MFA码
async function verifyMFA() {
  console.log('\n===== 验证MFA码 =====');
  
  if (!testUser.mfaCode) {
    console.error('错误: 没有MFA验证码可用');
    return false;
  }
  
  try {
    console.log('MFA验证请求数据:', {
      userId: testUser.id,
      mfaCode: testUser.mfaCode
    });
    
    const response = await axios.post(`${API_URL}/auth/verify-mfa`, {
      userId: testUser.id,
      mfaCode: testUser.mfaCode
    });
    
    console.log('MFA验证响应状态码:', response.status);
    console.log('MFA验证响应数据:', response.data);
    
    // 更新token
    if (response.data.token) {
      testUser.token = response.data.token;
      testUser.refreshToken = response.data.refreshToken;
      return true;
    } else {
      console.error('错误: MFA验证成功但未收到token');
      return false;
    }
  } catch (error) {
    console.error('MFA验证错误:');
    if (error.response) {
      console.error('状态码:', error.response.status);
      console.error('响应数据:', error.response.data);
    } else {
      console.error('错误:', error.message);
    }
    return false;
  }
}

// 3. 检查用户MFA状态
async function checkUserMFAStatus() {
  console.log('\n===== 检查用户MFA状态 =====');
  
  try {
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    
    const db = client.db();
    const user = await db.collection('users').findOne({ email: testUser.email });
    
    if (user) {
      console.log('用户ID:', user._id);
      console.log('MFA已启用:', user.isTwoFactorEnabled);
      console.log('MFA码:', user.mfaCode);
      console.log('MFA过期时间:', user.mfaExpire);
    } else {
      console.log('未找到用户');
    }
    
    await client.close();
    return user;
  } catch (error) {
    console.error('检查用户状态错误:', error.message);
    return null;
  }
}

// 执行MFA登录测试
async function testMFALogin() {
  console.log('========================================');
  console.log('        测试MFA登录流程');
  console.log('========================================');
  console.log('测试用户:', testUser);
  
  try {
    // 检查用户MFA状态
    await checkUserMFAStatus();
    
    // 1. 登录
    const loginResult = await loginUser();
    if (!loginResult.requireMFA) {
      console.error('登录失败或未要求MFA验证，终止测试');
      return;
    }
    
    // 输出MFA码
    console.log('\nMFA验证码:', loginResult.mfaCode);
    
    // 检查MFA状态
    await checkUserMFAStatus();
    
    // 2. 验证MFA
    const mfaVerified = await verifyMFA();
    if (!mfaVerified) {
      console.error('MFA验证失败，终止测试');
      return;
    }
    
    // 3. 最终检查
    await checkUserMFAStatus();
    
    console.log('\n========================================');
    console.log('        MFA登录流程测试成功');
    console.log('========================================');
  } catch (error) {
    console.error('测试过程中出现未捕获的错误:', error);
  }
}

// 执行测试
testMFALogin().catch(error => {
  console.error('未捕获的错误:', error);
}); 