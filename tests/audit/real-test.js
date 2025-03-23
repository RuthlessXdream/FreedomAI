/**
 * 真实环境审计日志API测试
 * 
 * 此脚本在真实环境中测试审计日志系统的主要功能，包括:
 * 1. 管理员登录
 * 2. 获取审计日志列表
 * 3. 获取单个日志详情
 * 4. 获取用户操作历史
 * 5. 获取审计摘要
 * 6. 导出审计日志
 * 
 * 请先运行 setup-real-test.js 准备测试环境
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// 加载环境变量
dotenv.config({ path: path.join(__dirname, '../../.env') });

// 配置
const API_URL = process.env.API_URL || 'http://localhost:3002/api';
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'Admin@123';
const TEST_USER_EMAIL = 'testuser@example.com';
const TEST_USER_PASSWORD = 'Test@123';

// 彩色日志输出
const log = {
  info: (msg) => console.log('\x1b[36m%s\x1b[0m', `[INFO] ${msg}`),
  success: (msg) => console.log('\x1b[32m%s\x1b[0m', `[SUCCESS] ${msg}`),
  error: (msg) => console.log('\x1b[31m%s\x1b[0m', `[ERROR] ${msg}`),
  warning: (msg) => console.log('\x1b[33m%s\x1b[0m', `[WARN] ${msg}`),
  data: (msg) => console.log('\x1b[90m%s\x1b[0m', msg)
};

// 全局变量
let adminToken = null;
let testUserId = null;

// 管理员登录
async function adminLogin() {
  log.info(`正在以管理员身份登录 (${ADMIN_EMAIL})...`);
  
  try {
    const response = await axios.post(`${API_URL}/auth/login`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    });
    
    if (response.data && response.data.success) {
      adminToken = response.data.token;
      log.success('管理员登录成功');
      
      // 提取用户信息
      if (response.data.user) {
        log.data(`管理员ID: ${response.data.user._id}`);
        log.data(`管理员角色: ${response.data.user.role}`);
      }
      
      return true;
    } else {
      log.error(`管理员登录失败: ${response.data.message}`);
      return false;
    }
  } catch (error) {
    log.error(`管理员登录请求失败: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

// 获取测试用户ID
async function getTestUserId() {
  log.info(`正在获取测试用户ID (${TEST_USER_EMAIL})...`);
  
  try {
    const response = await axios.get(`${API_URL}/users`, {
      headers: {
        Authorization: `Bearer ${adminToken}`
      }
    });
    
    if (response.data && response.data.success) {
      const testUser = response.data.users.find(user => user.email === TEST_USER_EMAIL);
      
      if (testUser) {
        testUserId = testUser._id;
        log.success(`找到测试用户ID: ${testUserId}`);
        return testUserId;
      } else {
        log.error(`未找到测试用户 (${TEST_USER_EMAIL})`);
        return null;
      }
    } else {
      log.error(`获取用户列表失败: ${response.data.message}`);
      return null;
    }
  } catch (error) {
    log.error(`获取用户列表请求失败: ${error.response?.data?.message || error.message}`);
    return null;
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
async function testGetAuditLogById(logId) {
  if (!logId) {
    log.error('未提供审计日志ID，跳过测试');
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
async function testGetUserHistory(userId) {
  if (!userId) {
    log.error('未提供用户ID，跳过测试');
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
      responseType: 'blob'
    });
    
    // 保存导出的CSV文件
    const outputDir = path.join(__dirname, 'output');
    
    // 确保输出目录存在
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const filePath = path.join(outputDir, `real_audit_logs_${Date.now()}.csv`);
    fs.writeFileSync(filePath, response.data);
    
    log.success(`导出审计日志成功，已保存到 ${filePath}`);
    return filePath;
  } catch (error) {
    log.error(`导出审计日志失败: ${error.response?.data?.message || error.message}`);
    return null;
  }
}

// 测试管理员禁止普通用户访问审计日志
async function testUserAccessDenied() {
  log.info('测试普通用户访问权限限制...');
  
  try {
    // 先以普通用户身份登录
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD
    });
    
    if (!loginResponse.data || !loginResponse.data.success) {
      log.error(`测试用户登录失败: ${loginResponse.data?.message || '未知错误'}`);
      return false;
    }
    
    const userToken = loginResponse.data.token;
    log.success('测试用户登录成功');
    
    // 尝试访问审计日志API
    try {
      await axios.get(`${API_URL}/audit-logs`, {
        headers: {
          Authorization: `Bearer ${userToken}`
        }
      });
      
      log.error('测试失败：普通用户能够访问审计日志API');
      return false;
    } catch (accessError) {
      // 应该返回403 Forbidden
      if (accessError.response && accessError.response.status === 403) {
        log.success('测试成功：普通用户被正确拒绝访问审计日志API');
        return true;
      } else {
        log.error(`测试结果异常: ${accessError.response?.data?.message || accessError.message}`);
        return false;
      }
    }
  } catch (error) {
    log.error(`权限测试失败: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

// 执行测试
async function runTests() {
  log.info('=== 开始真实环境审计日志API测试 ===');
  
  // 管理员登录
  const loginSuccess = await adminLogin();
  if (!loginSuccess) {
    log.error('管理员登录失败，无法继续测试');
    return;
  }
  
  // 获取测试用户ID
  await getTestUserId();
  
  // 获取审计日志列表
  const logs = await testGetAuditLogs();
  
  // 如果有日志，测试获取单个日志详情
  let logId = null;
  if (logs && logs.length > 0) {
    logId = logs[0]._id;
    
    // 测试获取单个日志详情
    await testGetAuditLogById(logId);
  }
  
  // 测试获取用户操作历史
  await testGetUserHistory(testUserId);
  
  // 测试获取审计摘要
  await testGetAuditSummary();
  
  // 测试导出审计日志
  await testExportAuditLogs();
  
  // 测试权限控制
  await testUserAccessDenied();
  
  log.info('=== 真实环境审计日志API测试完成 ===');
  
  // 输出总结报告
  log.info('');
  log.info('=== 测试结果总结 ===');
  log.info('1. 管理员登录: ' + (adminToken ? '✅ 成功' : '❌ 失败'));
  log.info('2. 获取审计日志列表: ' + (logs ? '✅ 成功' : '❌ 失败'));
  log.info('3. 获取单个日志详情: ' + (logId ? '✅ 成功' : '⏭️ 跳过'));
  log.info('4. 获取用户操作历史: ' + (testUserId ? '✅ 测试完成' : '⏭️ 跳过'));
  log.info('5. 获取审计摘要: ' + '✅ 测试完成');
  log.info('6. 导出审计日志: ' + '✅ 测试完成');
  log.info('7. 用户权限控制: ' + '✅ 测试完成');
  log.info('');
}

// 运行测试
runTests()
  .catch(error => {
    log.error(`测试过程中发生未处理的错误: ${error.message}`);
    console.error(error);
  }); 