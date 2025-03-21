/**
 * 用户认证系统测试脚本
 * 测试注册、邮箱验证、密码重置和MFA功能
 */

require('dotenv').config();
const axios = require('axios');
const readline = require('readline');
const crypto = require('crypto');

// 创建一个readline接口，用于获取用户输入
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// 询问用户输入
const question = (query) => new Promise((resolve) => rl.question(query, resolve));

// 生成随机字符串
const generateRandomString = (length = 8) => {
  return Math.random().toString(36).substring(2, 2 + length);
};

// 生成随机验证码
const generateCode = (length = 6) => {
  return Math.floor(Math.random() * (10 ** length - 10 ** (length - 1)) + 10 ** (length - 1)).toString();
};

// API基础URL
const API_URL = process.env.API_URL || 'http://localhost:3001/api';

// 当前时间戳
const timestamp = Date.now();

// 测试用户数据
const testUser = {
  username: `testuser_${timestamp}_${generateRandomString(8)}`,
  email: '',
  password: 'Password123',
  newPassword: 'NewPassword123',
  userId: null,
  token: null,
  refreshToken: null,
  verificationCode: generateCode(6), // 预生成验证码
  resetCode: generateCode(6), // 预生成重置码
  mfaCode: generateCode(6), // 预生成MFA码
};

// 主要测试流程
const runTests = async () => {
  try {
    console.log('======== 用户认证系统测试 ========');
    
    // 获取测试电子邮箱
    testUser.email = await question('请输入测试用邮箱地址: ');
    
    // 添加随机字符串到邮箱用户名部分，避免重复注册
    const [username, domain] = testUser.email.split('@');
    testUser.email = `${username}+${generateRandomString(6)}@${domain}`;
    console.log(`测试将使用邮箱: ${testUser.email}`);
    console.log(`预生成验证码: ${testUser.verificationCode}`);
    console.log(`预生成重置码: ${testUser.resetCode}`);
    console.log(`预生成MFA码: ${testUser.mfaCode}`);
    
    // 1. 测试用户注册
    await testRegistration();
    
    // 2. 测试邮箱验证
    const usePreGenerated = await question('是否使用预生成的验证码? (y/n): ');
    if (usePreGenerated.toLowerCase() !== 'y') {
      testUser.verificationCode = await question('请输入收到的邮箱验证码: ');
    }
    
    // 尝试两种验证方式
    try {
      await testEmailVerificationWithCode();
    } catch (error) {
      console.log('使用验证码验证失败，尝试使用URL验证...');
      try {
        await testEmailVerificationWithUrl();
      } catch (urlError) {
        throw new Error('两种验证方式均失败');
      }
    }
    
    // 3. 测试登录
    await testLogin();
    
    // 4. 测试密码重置
    await testPasswordReset();
    const usePreGeneratedReset = await question('是否使用预生成的重置码? (y/n): ');
    if (usePreGeneratedReset.toLowerCase() !== 'y') {
      testUser.resetCode = await question('请输入收到的密码重置验证码: ');
    }
    await testResetPassword();
    
    // 5. 测试使用新密码登录
    testUser.password = testUser.newPassword;
    await testLogin();
    
    // 6. 测试启用MFA
    await testEnableMFA();
    
    // 7. 测试MFA登录
    await testMFALogin();
    const usePreGeneratedMFA = await question('是否使用预生成的MFA码? (y/n): ');
    if (usePreGeneratedMFA.toLowerCase() !== 'y') {
      testUser.mfaCode = await question('请输入收到的MFA验证码: ');
    }
    await testVerifyMFA();
    
    // 8. 测试禁用MFA
    await testDisableMFA();
    
    // 9. 测试注销
    await testLogout();
    
    console.log('======== 测试完成 ========');
  } catch (error) {
    console.error('测试过程中出错:', error.response?.data || error.message);
  } finally {
    rl.close();
  }
};

// 测试用户注册
const testRegistration = async () => {
  console.log('\n测试用户注册...');
  
  try {
    const registrationData = {
      username: testUser.username,
      email: testUser.email,
      password: testUser.password
    };
    
    // 如果提供了预生成验证码，设置到请求数据中
    if (testUser.verificationCode) {
      registrationData.verificationCode = testUser.verificationCode;
    }
    
    const response = await axios.post(`${API_URL}/auth/register`, registrationData);
    
    console.log('注册成功:', response.data);
    testUser.userId = response.data.userId;
    return response.data;
  } catch (error) {
    console.error('注册失败:', error.response?.data);
    throw error;
  }
};

// 测试基于验证码的邮箱验证
const testEmailVerificationWithCode = async () => {
  console.log('\n测试邮箱验证（验证码方式）...');
  
  try {
    const response = await axios.post(`${API_URL}/auth/verify-email`, {
      email: testUser.email,
      verificationCode: testUser.verificationCode
    });
    
    console.log('邮箱验证成功:', response.data);
    return response.data;
  } catch (error) {
    console.error('邮箱验证失败:', error.response?.data);
    throw error;
  }
};

// 测试基于URL的邮箱验证（原有方式）
const testEmailVerificationWithUrl = async () => {
  console.log('\n测试邮箱验证（URL方式）...');
  
  try {
    // 生成随机令牌
    const token = crypto.randomBytes(20).toString('hex');
    
    const response = await axios.get(`${API_URL}/auth/verify-email/${token}`);
    
    console.log('邮箱验证成功:', response.data);
    return response.data;
  } catch (error) {
    console.error('邮箱验证失败:', error.response?.data);
    throw error;
  }
};

// 测试登录
const testLogin = async () => {
  console.log('\n测试用户登录...');
  
  try {
    const response = await axios.post(`${API_URL}/auth/login`, {
      email: testUser.email,
      password: testUser.password
    });
    
    // 检查是否需要MFA验证
    if (response.data.requireMFA) {
      console.log('需要MFA验证:', response.data);
      testUser.userId = response.data.userId;
      return response.data;
    }
    
    console.log('登录成功:', response.data);
    testUser.token = response.data.token;
    testUser.refreshToken = response.data.refreshToken;
    testUser.userId = response.data.user._id;
    return response.data;
  } catch (error) {
    console.error('登录失败:', error.response?.data);
    throw error;
  }
};

// 测试密码重置请求
const testPasswordReset = async () => {
  console.log('\n测试密码重置请求...');
  
  try {
    const resetData = {
      email: testUser.email
    };
    
    // 如果提供了预生成重置码，设置到请求数据中
    if (testUser.resetCode) {
      resetData.resetCode = testUser.resetCode;
    }
    
    const response = await axios.post(`${API_URL}/auth/password-reset`, resetData);
    
    console.log('密码重置请求成功:', response.data);
    return response.data;
  } catch (error) {
    console.error('密码重置请求失败:', error.response?.data);
    throw error;
  }
};

// 测试密码重置
const testResetPassword = async () => {
  console.log('\n测试密码重置...');
  
  try {
    const response = await axios.post(`${API_URL}/auth/password-reset/verify`, {
      email: testUser.email,
      resetCode: testUser.resetCode,
      newPassword: testUser.newPassword
    });
    
    console.log('密码重置成功:', response.data);
    return response.data;
  } catch (error) {
    console.error('密码重置失败:', error.response?.data);
    throw error;
  }
};

// 测试启用MFA
const testEnableMFA = async () => {
  console.log('\n测试启用MFA...');
  
  try {
    const response = await axios.post(
      `${API_URL}/auth/toggle-mfa`,
      {},
      {
        headers: {
          Authorization: `Bearer ${testUser.token}`
        }
      }
    );
    
    console.log('MFA启用成功:', response.data);
    return response.data;
  } catch (error) {
    console.error('MFA启用失败:', error.response?.data);
    throw error;
  }
};

// 测试MFA登录
const testMFALogin = async () => {
  console.log('\n测试MFA登录...');
  
  try {
    const response = await axios.post(`${API_URL}/auth/login`, {
      email: testUser.email,
      password: testUser.password
    });
    
    if (!response.data.requireMFA) {
      throw new Error('登录成功但未要求MFA验证');
    }
    
    console.log('MFA登录请求成功:', response.data);
    testUser.userId = response.data.userId;
    return response.data;
  } catch (error) {
    console.error('MFA登录请求失败:', error.response?.data);
    throw error;
  }
};

// 测试验证MFA
const testVerifyMFA = async () => {
  console.log('\n测试验证MFA...');
  
  try {
    const response = await axios.post(`${API_URL}/auth/verify-mfa`, {
      userId: testUser.userId,
      mfaCode: testUser.mfaCode
    });
    
    console.log('MFA验证成功:', response.data);
    testUser.token = response.data.token;
    testUser.refreshToken = response.data.refreshToken;
    return response.data;
  } catch (error) {
    console.error('MFA验证失败:', error.response?.data);
    throw error;
  }
};

// 测试禁用MFA
const testDisableMFA = async () => {
  console.log('\n测试禁用MFA...');
  
  try {
    const response = await axios.post(
      `${API_URL}/auth/toggle-mfa`,
      {},
      {
        headers: {
          Authorization: `Bearer ${testUser.token}`
        }
      }
    );
    
    console.log('MFA禁用成功:', response.data);
    return response.data;
  } catch (error) {
    console.error('MFA禁用失败:', error.response?.data);
    throw error;
  }
};

// 测试注销
const testLogout = async () => {
  console.log('\n测试用户注销...');
  
  try {
    const response = await axios.post(
      `${API_URL}/auth/logout`,
      {},
      {
        headers: {
          Authorization: `Bearer ${testUser.token}`
        }
      }
    );
    
    console.log('注销成功:', response.data);
    return response.data;
  } catch (error) {
    console.error('注销失败:', error.response?.data);
    throw error;
  }
};

// 执行测试
runTests(); 