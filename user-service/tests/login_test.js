/**
 * 用户登录测试脚本
 * 使用方法: node login_test.js <email> <password>
 */

const axios = require('axios');

// 配置
const API_URL = 'http://localhost:3002/api';

// 获取命令行参数
const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  console.error('错误: 请提供邮箱地址和密码');
  console.error('使用方法: node login_test.js <email> <password>');
  process.exit(1);
}

// 登录测试
async function loginTest() {
  try {
    console.log(`开始登录测试: ${email}`);
    
    const response = await axios.post(`${API_URL}/auth/login`, {
      email,
      password
    });
    
    console.log('登录响应状态码:', response.status);
    
    if (response.data.success) {
      console.log('==========================================');
      console.log('登录成功!');
      console.log('==========================================');
      
      if (response.data.requireMFA) {
        console.log('需要MFA验证');
        console.log(`用户ID: ${response.data.userId}`);
        if (response.data.mfaCode) {
          console.log(`MFA验证码: ${response.data.mfaCode}`);
        } else {
          console.log('MFA验证码已发送到您的邮箱');
        }
        console.log('==========================================');
      } else {
        console.log('用户信息:');
        console.log(`用户名: ${response.data.user.username}`);
        console.log(`邮箱: ${response.data.user.email}`);
        console.log(`角色: ${response.data.user.role}`);
        console.log('==========================================');
        console.log('令牌信息:');
        console.log(`访问令牌: ${response.data.token.substring(0, 20)}...`);
        console.log(`刷新令牌: ${response.data.refreshToken.substring(0, 20)}...`);
        console.log('==========================================');
      }
    } else {
      console.error('登录失败:', response.data.message);
    }
  } catch (error) {
    console.error('登录过程中发生错误:');
    if (error.response) {
      console.error(`状态码: ${error.response.status}`);
      console.error(`错误信息: ${JSON.stringify(error.response.data)}`);
    } else {
      console.error(error.message);
    }
  }
}

// 执行登录测试
loginTest(); 