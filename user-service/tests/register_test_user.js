/**
 * 测试用户注册脚本
 * 使用方法: node register_test_user.js <email>
 */

const axios = require('axios');
const crypto = require('crypto');

// 配置
const API_URL = 'http://localhost:3002/api';

// 获取命令行参数中的邮箱
const email = process.argv[2];

if (!email) {
  console.error('错误: 请提供邮箱地址');
  console.error('使用方法: node register_test_user.js <email>');
  process.exit(1);
}

// 随机用户名
const username = `test_${Date.now()}`;
const password = 'Password123!';

// 注册用户
async function registerTestUser() {
  try {
    console.log(`开始注册测试用户: ${username} (${email})`);
    
    const response = await axios.post(`${API_URL}/auth/register`, {
      username,
      email,
      password
    });
    
    if (response.data.success) {
      console.log('==========================================');
      console.log('注册成功! 验证邮件已发送.');
      console.log('==========================================');
      console.log(`用户名: ${username}`);
      console.log(`邮箱: ${email}`);
      console.log(`验证码: ${response.data.verificationCode}`);
      console.log('==========================================');
      console.log('请检查您的邮箱并输入验证码以完成注册');
      console.log('==========================================');
    } else {
      console.error('注册失败:', response.data.message);
    }
  } catch (error) {
    console.error('注册过程中发生错误:');
    if (error.response) {
      console.error(`状态码: ${error.response.status}`);
      console.error(`错误信息: ${JSON.stringify(error.response.data)}`);
    } else {
      console.error(error.message);
    }
  }
}

// 执行注册
registerTestUser(); 