/**
 * 切换MFA状态测试脚本
 * 使用方法: node toggle_mfa_test.js <token>
 */

const axios = require('axios');

// 配置
const API_URL = 'http://localhost:3002/api';

// 获取命令行参数
const token = process.argv[2];

if (!token) {
  console.error('错误: 请提供访问令牌');
  console.error('使用方法: node toggle_mfa_test.js <token>');
  process.exit(1);
}

// 切换MFA状态测试
async function toggleMFATest() {
  try {
    console.log('开始切换MFA状态测试');
    
    const response = await axios.post(
      `${API_URL}/auth/toggle-mfa`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );
    
    console.log('响应状态码:', response.status);
    
    if (response.data.success) {
      console.log('==========================================');
      console.log(`MFA状态已${response.data.isTwoFactorEnabled ? '启用' : '禁用'}`);
      console.log(`消息: ${response.data.message}`);
      console.log('==========================================');
    } else {
      console.error('切换MFA状态失败:', response.data.message);
    }
  } catch (error) {
    console.error('切换MFA状态过程中发生错误:');
    if (error.response) {
      console.error(`状态码: ${error.response.status}`);
      console.error(`错误信息: ${JSON.stringify(error.response.data)}`);
    } else {
      console.error(error.message);
    }
  }
}

// 执行测试
toggleMFATest(); 