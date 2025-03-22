/**
 * 测试MFA验证流程
 */
const axios = require('axios');
const { MongoClient } = require('mongodb');

// API基础URL
const BASE_URL = 'http://localhost:3002';
const API_URL = `${BASE_URL}/api`;
const MONGO_URI = 'mongodb://localhost:27017/user-service';

// 测试数据
const testData = {
  user: {
    username: `mfatest_${Date.now()}`,
    email: `mfatest${Date.now()}@example.com`,
    password: 'Password123!'
  },
  tokens: {},
  mfaEnabled: false,
  mfaCode: null
};

// 1. 创建测试用户
async function createTestUser() {
  console.log('\n===== 创建测试用户 =====');
  console.log('测试用户:', testData.user);
  
  try {
    const response = await axios.post(`${API_URL}/auth/register`, testData.user);
    console.log('注册响应状态码:', response.status);
    console.log('注册响应:', response.data);
    
    if (response.data.userId) {
      testData.user.id = response.data.userId;
      testData.verificationCode = response.data.verificationCode;
      return true;
    } else {
      console.log('注册失败，未获取到用户ID');
      return false;
    }
  } catch (error) {
    console.error('注册错误:');
    if (error.response) {
      console.error('状态码:', error.response.status);
      console.error('响应数据:', error.response.data);
    } else {
      console.error('错误:', error.message);
    }
    return false;
  }
}

// 2. 验证邮箱
async function verifyEmailInDb() {
  console.log('\n===== 验证邮箱 =====');
  
  try {
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    
    const db = client.db();
    const updateResult = await db.collection('users').updateOne(
      { email: testData.user.email },
      { $set: { isVerified: true } }
    );
    
    console.log('邮箱验证结果:', updateResult.modifiedCount > 0 ? '成功' : '失败');
    
    await client.close();
    return updateResult.modifiedCount > 0;
  } catch (error) {
    console.error('邮箱验证错误:', error.message);
    return false;
  }
}

// 3. 用户登录
async function loginUser() {
  console.log('\n===== 用户登录 =====');
  
  try {
    console.log('登录请求数据:', {
      email: testData.user.email,
      password: testData.user.password
    });
    
    const response = await axios.post(`${API_URL}/auth/login`, {
      email: testData.user.email,
      password: testData.user.password
    });
    
    console.log('登录响应状态码:', response.status);
    console.log('登录响应:', response.data);
    
    // 检查是否需要MFA验证
    if (response.data.requireMFA) {
      console.log('需要MFA验证!');
      testData.user.id = response.data.userId;
      testData.mfaCode = response.data.mfaCode;
      return { requireMFA: true };
    }
    
    // 正常登录
    testData.tokens.accessToken = response.data.token;
    testData.tokens.refreshToken = response.data.refreshToken;
    
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

// 4. 启用MFA
async function enableMFA() {
  console.log('\n===== 启用MFA =====');
  
  try {
    const response = await axios.post(
      `${API_URL}/auth/toggle-mfa`, 
      {},
      {
        headers: {
          Authorization: `Bearer ${testData.tokens.accessToken}`
        }
      }
    );
    
    console.log('MFA切换响应状态码:', response.status);
    console.log('MFA切换响应:', response.data);
    
    testData.mfaEnabled = response.data.isTwoFactorEnabled;
    return testData.mfaEnabled;
  } catch (error) {
    console.error('MFA切换错误:');
    if (error.response) {
      console.error('状态码:', error.response.status);
      console.error('响应数据:', error.response.data);
    } else {
      console.error('错误:', error.message);
    }
    return false;
  }
}

// 5. 登出
async function logout() {
  console.log('\n===== 用户登出 =====');
  
  try {
    const response = await axios.post(
      `${API_URL}/auth/logout`,
      {},
      {
        headers: {
          Authorization: `Bearer ${testData.tokens.accessToken}`
        }
      }
    );
    
    console.log('登出响应状态码:', response.status);
    console.log('登出响应:', response.data);
    
    // 清除token
    testData.tokens = {};
    return true;
  } catch (error) {
    console.error('登出错误:');
    if (error.response) {
      console.error('状态码:', error.response.status);
      console.error('响应数据:', error.response.data);
    } else {
      console.error('错误:', error.message);
    }
    return false;
  }
}

// 6. 再次登录（应当需要MFA验证）
async function loginWithMFA() {
  console.log('\n===== MFA登录 =====');
  
  try {
    console.log('登录请求数据:', {
      email: testData.user.email,
      password: testData.user.password
    });
    
    const response = await axios.post(`${API_URL}/auth/login`, {
      email: testData.user.email,
      password: testData.user.password
    });
    
    console.log('MFA登录响应状态码:', response.status);
    console.log('MFA登录响应:', response.data);
    
    if (!response.data.requireMFA) {
      console.error('错误: 已启用MFA但未要求MFA验证');
      return { success: false, reason: 'notRequireMFA' };
    }
    
    testData.user.id = response.data.userId;
    testData.mfaCode = response.data.mfaCode || null;
    
    return { 
      success: true, 
      requireMFA: true,
      mfaCode: testData.mfaCode 
    };
  } catch (error) {
    console.error('MFA登录错误:');
    if (error.response) {
      console.error('状态码:', error.response.status);
      console.error('响应数据:', error.response.data);
    } else {
      console.error('错误:', error.message);
    }
    return { success: false };
  }
}

// 7. 验证MFA码
async function verifyMFA() {
  console.log('\n===== 验证MFA码 =====');
  
  if (!testData.mfaCode) {
    console.error('错误: 没有MFA验证码可用');
    return false;
  }
  
  try {
    const response = await axios.post(`${API_URL}/auth/verify-mfa`, {
      userId: testData.user.id,
      mfaCode: testData.mfaCode
    });
    
    console.log('MFA验证响应状态码:', response.status);
    console.log('MFA验证响应:', response.data);
    
    // 更新token
    if (response.data.token) {
      testData.tokens.accessToken = response.data.token;
      testData.tokens.refreshToken = response.data.refreshToken;
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

// 8. 检查用户状态
async function checkUserStatus() {
  console.log('\n===== 检查用户状态 =====');
  
  try {
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    
    const db = client.db();
    const user = await db.collection('users').findOne({ email: testData.user.email });
    
    if (user) {
      console.log('用户ID:', user._id);
      console.log('用户名:', user.username);
      console.log('邮箱:', user.email);
      console.log('MFA已启用:', user.isTwoFactorEnabled);
      console.log('MFA码:', user.mfaCode);
      console.log('MFA过期时间:', user.mfaExpire);
      console.log('登录尝试次数:', user.loginAttempts);
      console.log('账户是否锁定:', user.isLocked);
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

// 执行完整的MFA验证流程测试
async function testMFAProcess() {
  console.log('========================================');
  console.log('       测试MFA验证流程');
  console.log('========================================');
  
  try {
    // 1. 创建测试用户
    const userCreated = await createTestUser();
    if (!userCreated) {
      console.error('用户创建失败，终止测试');
      return;
    }
    
    // 2. 验证邮箱
    const emailVerified = await verifyEmailInDb();
    if (!emailVerified) {
      console.error('邮箱验证失败，终止测试');
      return;
    }
    
    // 3. 登录
    const loginResult = await loginUser();
    if (!loginResult.success && !loginResult.requireMFA) {
      console.error('登录失败，终止测试');
      return;
    }
    
    // 检查用户状态
    await checkUserStatus();
    
    // 4. 启用MFA
    const mfaEnabled = await enableMFA();
    if (!mfaEnabled) {
      console.error('启用MFA失败，终止测试');
      return;
    }
    
    // 检查用户状态
    await checkUserStatus();
    
    // 5. 登出
    const loggedOut = await logout();
    if (!loggedOut) {
      console.error('登出失败，终止测试');
      return;
    }
    
    // 6. 再次登录（应当需要MFA验证）
    const mfaLoginResult = await loginWithMFA();
    if (!mfaLoginResult.success) {
      console.error('MFA登录失败，终止测试');
      await checkUserStatus();
      return;
    }
    
    if (!mfaLoginResult.requireMFA) {
      console.error('启用MFA后再次登录未要求MFA验证，终止测试');
      await checkUserStatus();
      return;
    }
    
    // 检查用户状态
    await checkUserStatus();
    
    // 7. 验证MFA码
    const mfaVerified = await verifyMFA();
    if (!mfaVerified) {
      console.error('MFA验证失败，终止测试');
      return;
    }
    
    // 8. 最终检查用户状态
    await checkUserStatus();
    
    console.log('\n========================================');
    console.log('        MFA验证流程测试完成');
    console.log('========================================');
  } catch (error) {
    console.error('测试过程中出现未捕获的错误:', error);
  }
}

// 执行测试
testMFAProcess().catch(error => {
  console.error('未捕获的错误:', error);
}); 