/**
 * MFA验证测试脚本
 * 使用方法: node verify_mfa_test.js <userId> <mfaCode>
 */

const axios = require('axios');

// 配置
const API_URL = 'http://localhost:3002/api';

// 获取命令行参数
const userId = process.argv[2];
const mfaCode = process.argv[3];

if (!userId || !mfaCode) {
  console.error('错误: 请提供用户ID和MFA验证码');
  console.error('使用方法: node verify_mfa_test.js <userId> <mfaCode>');
  process.exit(1);
}

// MFA验证测试
async function verifyMFATest() {
  try {
    console.log(`开始MFA验证测试:`);
    console.log(`用户ID: ${userId}`);
    console.log(`MFA验证码: ${mfaCode}`);
    
    const response = await axios.post(`${API_URL}/auth/verify-mfa`, {
      userId,
      mfaCode
    });
    
    console.log('响应状态码:', response.status);
    
    if (response.data.success) {
      console.log('==========================================');
      console.log('MFA验证成功!');
      console.log('==========================================');
      console.log('用户信息:');
      console.log(`用户名: ${response.data.user.username}`);
      console.log(`邮箱: ${response.data.user.email}`);
      console.log(`角色: ${response.data.user.role}`);
      console.log('==========================================');
      console.log('令牌信息:');
      console.log(`访问令牌: ${response.data.token.substring(0, 20)}...`);
      console.log(`刷新令牌: ${response.data.refreshToken.substring(0, 20)}...`);
      console.log('==========================================');
    } else {
      console.error('MFA验证失败:', response.data.message);
    }
  } catch (error) {
    console.error('MFA验证过程中发生错误:');
    if (error.response) {
      console.error(`状态码: ${error.response.status}`);
      console.error(`错误信息: ${JSON.stringify(error.response.data)}`);
    } else {
      console.error(error.message);
    }
  }
}

// 执行测试
verifyMFATest(); 