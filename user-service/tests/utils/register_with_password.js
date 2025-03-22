/**
 * 使用指定密码注册测试用户
 * 使用方法: node register_with_password.js <email> <password>
 */

const axios = require('axios');

// 配置
const API_URL = 'http://localhost:3002/api';

// 获取命令行参数
const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  console.error('错误: 请提供邮箱地址和密码');
  console.error('使用方法: node register_with_password.js <email> <password>');
  process.exit(1);
}

// 随机用户名
const username = `test_${Date.now()}`;

// 注册用户
async function registerTestUser() {
  try {
    console.log(`开始注册测试用户: ${username}`);
    console.log(`邮箱: ${email}`);
    console.log(`密码: ${password}`);
    
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