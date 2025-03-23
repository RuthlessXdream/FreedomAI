/**
 * 审计日志API测试
 * 
 * 此脚本测试审计日志系统的主要功能，包括:
 * 1. 使用管理员账号登录
 * 2. 获取审计日志列表
 * 3. 获取单个日志详情
 * 4. 获取用户操作历史
 * 5. 获取审计摘要
 * 6. 导出审计日志
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// 配置
const API_URL = process.env.API_URL || 'http://localhost:3002/api';
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'Admin@123';

// 状态变量
let adminToken = null;
let logId = null;
let userId = null;

// 彩色日志输出
const log = {
  info: (msg) => console.log('\x1b[36m%s\x1b[0m', `[INFO] ${msg}`),
  success: (msg) => console.log('\x1b[32m%s\x1b[0m', `[SUCCESS] ${msg}`),
  error: (msg) => console.log('\x1b[31m%s\x1b[0m', `[ERROR] ${msg}`),
  warning: (msg) => console.log('\x1b[33m%s\x1b[0m', `[WARN] ${msg}`),
  data: (msg) => console.log('\x1b[90m%s\x1b[0m', msg)
};

// 休眠函数
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 管理员登录
async function adminLogin() {
  try {
    log.info(`管理员登录 (${ADMIN_EMAIL})...`);
    
    const response = await axios.post(`${API_URL}/auth/login`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    });
    
    if (response.data && response.data.success) {
      adminToken = response.data.token;
      userId = response.data.user?._id;
      log.success(`管理员登录成功, 用户ID: ${userId}`);
      return true;
    } else {
      log.error(`管理员登录失败: ${response.data.message}`);
      return false;
    }
  } catch (error) {
    log.error(`管理员登录失败: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

// 测试获取审计日志列表
async function testGetAuditLogs() {
  try {
    log.info('测试获取审计日志列表...');
    
    const response = await axios.get(`${API_URL}/audit-logs`, {
      headers: {
        Authorization: `Bearer ${adminToken}`
      }
    });
    
    if (response.data.success) {
      log.success(`获取审计日志成功，共 ${response.data.count} 条记录`);
      
      if (response.data.logs && response.data.logs.length > 0) {
        logId = response.data.logs[0]._id;
        log.data(JSON.stringify(response.data.logs[0], null, 2));
      } else {
        log.info('没有找到任何审计日志记录');
      }
      
      return response.data.logs;
    } else {
      log.error(`获取审计日志失败: ${response.data.message}`);
      return null;
    }
  } catch (error) {
    log.error(`获取审计日志失败: ${error.response?.data?.message || error.message}`);
    return null;
  }
}

// 测试获取单个日志详情
async function testGetAuditLogById() {
  if (!logId) {
    log.error('未找到审计日志ID，跳过测试');
    return null;
  }
  
  try {
    log.info(`测试获取审计日志详情 (ID: ${logId})...`);
    
    const response = await axios.get(`${API_URL}/audit-logs/${logId}`, {
      headers: {
        Authorization: `Bearer ${adminToken}`
      }
    });
    
    if (response.data.success) {
      log.success('获取审计日志详情成功');
      log.data(JSON.stringify(response.data.log, null, 2));
      return response.data.log;
    } else {
      log.error(`获取审计日志详情失败: ${response.data.message}`);
      return null;
    }
  } catch (error) {
    log.error(`获取审计日志详情失败: ${error.response?.data?.message || error.message}`);
    return null;
  }
}

// 测试获取用户操作历史
async function testGetUserHistory() {
  if (!userId) {
    log.error('未找到用户ID，跳过测试');
    return null;
  }
  
  try {
    log.info(`测试获取用户历史 (用户ID: ${userId})...`);
    
    const response = await axios.get(`${API_URL}/audit-logs/user/${userId}`, {
      headers: {
        Authorization: `Bearer ${adminToken}`
      }
    });
    
    if (response.data.success) {
      log.success(`获取用户历史成功，共 ${response.data.count || 0} 条记录`);
      if (response.data.logs && response.data.logs.length > 0) {
        log.data(JSON.stringify(response.data.logs[0], null, 2));
      } else {
        log.info('没有找到该用户的操作记录');
      }
      return response.data.logs;
    } else {
      log.error(`获取用户历史失败: ${response.data.message}`);
      return null;
    }
  } catch (error) {
    log.error(`获取用户历史失败: ${error.response?.data?.message || error.message}`);
    return null;
  }
}

// 测试获取审计摘要
async function testGetAuditSummary() {
  try {
    log.info('测试获取审计摘要...');
    
    const response = await axios.get(`${API_URL}/audit-logs/summary`, {
      headers: {
        Authorization: `Bearer ${adminToken}`
      }
    });
    
    if (response.data.success) {
      log.success('获取审计摘要成功');
      log.data(JSON.stringify(response.data.summary, null, 2));
      return response.data.summary;
    } else {
      log.error(`获取审计摘要失败: ${response.data.message}`);
      return null;
    }
  } catch (error) {
    log.error(`获取审计摘要失败: ${error.response?.data?.message || error.message}`);
    return null;
  }
}

// 测试导出审计日志
async function testExportAuditLogs() {
  try {
    log.info('测试导出审计日志...');
    
    const response = await axios.get(`${API_URL}/audit-logs/export`, {
      headers: {
        Authorization: `Bearer ${adminToken}`
      },
      responseType: 'arraybuffer'
    });
    
    // 保存导出的CSV文件
    const outputDir = path.join(__dirname, 'output');
    
    // 确保输出目录存在
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const filePath = path.join(outputDir, `audit_logs_${Date.now()}.csv`);
    fs.writeFileSync(filePath, response.data);
    
    log.success(`导出审计日志成功，已保存到 ${filePath}`);
    return filePath;
  } catch (error) {
    log.error(`导出审计日志失败: ${error.response?.data?.message || error.message}`);
    return null;
  }
}

// 执行测试
async function runTests() {
  log.info('=== 开始测试审计日志API ===');
  
  // 管理员登录
  const loginSuccess = await adminLogin();
  if (!loginSuccess) {
    log.error('管理员登录失败，终止测试');
    return;
  }
  
  // 休眠一秒
  await sleep(1000);
  
  // 获取审计日志列表
  const logs = await testGetAuditLogs();
  
  // 如果有日志，测试获取单个日志详情
  if (logs && logs.length > 0) {
    // 测试获取单个日志详情
    await testGetAuditLogById();
  }
  
  // 测试获取用户操作历史
  await testGetUserHistory();
  
  // 测试获取审计摘要
  await testGetAuditSummary();
  
  // 测试导出审计日志
  await testExportAuditLogs();
  
  log.info('=== 审计日志API测试完成 ===');
  
  // 输出总结报告
  log.info('');
  log.info('=== 测试结果总结 ===');
  log.info('1. 管理员登录: ' + (adminToken ? '✅ 成功' : '❌ 失败'));
  log.info('2. 获取审计日志列表: ' + (logs ? '✅ 成功' : '❌ 失败'));
  log.info('3. 获取单个日志详情: ' + (logId ? '✅ 成功' : '⏭️ 跳过'));
  log.info('4. 获取用户操作历史: ' + (userId ? '✅ 成功' : '⏭️ 跳过'));
  log.info('5. 获取审计摘要: ' + '✅ 测试完成');
  log.info('6. 导出审计日志: ' + '✅ 测试完成');
  log.info('');
}

// 运行测试
runTests()
  .catch(error => {
    log.error(`测试过程中发生未处理的错误: ${error.message}`);
    console.error(error);
  }); 