/**
 * 邮箱验证脚本
 * 使用方法: node verify_email.js <email> <verification_code>
 */

const axios = require('axios');

// 配置
const API_URL = 'http://localhost:3002/api';

// 获取命令行参数
const email = process.argv[2];
const verificationCode = process.argv[3];

if (!email || !verificationCode) {
  console.error('错误: 请提供邮箱地址和验证码');
  console.error('使用方法: node verify_email.js <email> <verification_code>');
  process.exit(1);
}

// 验证邮箱
async function verifyEmail() {
  try {
    console.log(`开始验证邮箱: ${email}`);
    console.log(`验证码: ${verificationCode}`);
    
    const response = await axios.post(`${API_URL}/auth/verify-email`, {
      email,
      verificationCode
    });
    
    if (response.data.success) {
      console.log('==========================================');
      console.log('验证成功!');
      console.log('==========================================');
      console.log('您的邮箱已通过验证，现在可以登录了');
      console.log('==========================================');
    } else {
      console.error('验证失败:', response.data.message);
    }
  } catch (error) {
    console.error('验证过程中发生错误:');
    if (error.response) {
      console.error(`状态码: ${error.response.status}`);
      console.error(`错误信息: ${JSON.stringify(error.response.data)}`);
    } else {
      console.error(error.message);
    }
  }
}

// 执行验证
verifyEmail(); 