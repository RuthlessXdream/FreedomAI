/**
 * 审计日志API真实环境测试脚本
 * 用于在真实环境中测试审计日志API的功能
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

// 配置
const config = {
  baseUrl: 'http://localhost:3000', // API服务器地址
  loginEndpoint: '/api/auth/login',
  auditLogEndpoint: '/api/audit-logs',
  auditLogDetailsEndpoint: '/api/audit-logs/',
  auditLogUserEndpoint: '/api/audit-logs/user/',
  auditLogSummaryEndpoint: '/api/audit-logs/summary',
  auditLogExportEndpoint: '/api/audit-logs/export',
  // 测试管理员账户
  adminCredentials: {
    email: 'admin@example.com',
    password: 'admin123',
  },
  outputDir: path.join(__dirname, 'output'),
};

// 确保输出目录存在
if (!fs.existsSync(config.outputDir)) {
  fs.mkdirSync(config.outputDir, { recursive: true });
}

// 日志记录
function log(message, type = 'info') {
  const timestamp = new Date().toISOString().substring(11, 19);
  switch (type) {
    case 'success':
      console.log(chalk.green(`[${timestamp}] ✓ ${message}`));
      break;
    case 'error':
      console.log(chalk.red(`[${timestamp}] ✖ ${message}`));
      break;
    case 'warn':
      console.log(chalk.yellow(`[${timestamp}] ⚠ ${message}`));
      break;
    case 'info':
    default:
      console.log(chalk.blue(`[${timestamp}] ℹ ${message}`));
      break;
  }
}

// 认证并获取访问令牌
async function authenticate() {
  log('尝试使用管理员账户登录...');
  try {
    const response = await axios.post(`${config.baseUrl}${config.loginEndpoint}`, config.adminCredentials);
    const { accessToken, user } = response.data;
    log(`认证成功! 用户: ${user.email} (ID: ${user._id})`, 'success');
    return { accessToken, userId: user._id };
  } catch (error) {
    log(`认证失败: ${error.message}`, 'error');
    throw new Error('无法获取访问令牌');
  }
}

// 测试获取审计日志列表
async function testGetAuditLogs(accessToken) {
  log('测试获取审计日志列表...');
  try {
    const response = await axios.get(`${config.baseUrl}${config.auditLogEndpoint}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    
    const { logs, pagination } = response.data;
    log(`成功获取审计日志列表! 获取到 ${logs.length} 条记录`, 'success');
    log(`分页信息: 当前页 ${pagination.currentPage}, 总页数 ${pagination.totalPages}, 总记录数 ${pagination.totalItems}`);
    
    // 输出示例记录
    if (logs.length > 0) {
      log('示例记录:');
      logs.slice(0, 3).forEach((log, index) => {
        console.log(`  ${index + 1}. [${log.action}] ${log.description} - ${new Date(log.timestamp).toLocaleString()}`);
      });
    }
    
    return logs;
  } catch (error) {
    log(`获取审计日志列表失败: ${error.message}`, 'error');
    throw error;
  }
}

// 测试获取审计日志详情
async function testGetAuditLogDetails(accessToken, logId) {
  log(`测试获取审计日志详情 (ID: ${logId})...`);
  try {
    const response = await axios.get(`${config.baseUrl}${config.auditLogDetailsEndpoint}${logId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    
    const logDetails = response.data.log;
    log(`成功获取审计日志详情!`, 'success');
    log('日志详情:');
    console.log(`  操作: ${logDetails.action}`);
    console.log(`  描述: ${logDetails.description}`);
    console.log(`  用户: ${logDetails.userId}`);
    console.log(`  IP地址: ${logDetails.ipAddress}`);
    console.log(`  时间: ${new Date(logDetails.timestamp).toLocaleString()}`);
    console.log(`  详细数据: ${JSON.stringify(logDetails.details, null, 2)}`);
    
    return logDetails;
  } catch (error) {
    log(`获取审计日志详情失败: ${error.message}`, 'error');
    throw error;
  }
}

// 测试获取用户操作历史
async function testGetUserHistory(accessToken, userId) {
  log(`测试获取用户操作历史 (用户ID: ${userId})...`);
  try {
    const response = await axios.get(`${config.baseUrl}${config.auditLogUserEndpoint}${userId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    
    const { logs } = response.data;
    log(`成功获取用户操作历史! 获取到 ${logs.length} 条记录`, 'success');
    
    // 输出示例记录
    if (logs.length > 0) {
      log('用户最近操作:');
      logs.slice(0, 5).forEach((log, index) => {
        console.log(`  ${index + 1}. [${log.action}] ${log.description} - ${new Date(log.timestamp).toLocaleString()}`);
      });
    } else {
      log('该用户暂无操作记录', 'warn');
    }
    
    return logs;
  } catch (error) {
    log(`获取用户操作历史失败: ${error.message}`, 'error');
    throw error;
  }
}

// 测试获取审计日志摘要
async function testGetAuditLogSummary(accessToken) {
  log('测试获取审计日志摘要...');
  try {
    const response = await axios.get(`${config.baseUrl}${config.auditLogSummaryEndpoint}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    
    const summary = response.data.summary;
    log(`成功获取审计日志摘要!`, 'success');
    log('摘要信息:');
    console.log(`  总操作数: ${summary.totalActions}`);
    console.log(`  用户操作分布:`);
    for (const [action, count] of Object.entries(summary.actionCounts)) {
      console.log(`    ${action}: ${count} 次`);
    }
    console.log(`  活跃用户数: ${summary.activeUsers}`);
    console.log(`  最近 24 小时操作数: ${summary.last24Hours}`);
    
    return summary;
  } catch (error) {
    log(`获取审计日志摘要失败: ${error.message}`, 'error');
    throw error;
  }
}

// 测试导出审计日志
async function testExportAuditLogs(accessToken) {
  log('测试导出审计日志...');
  try {
    const response = await axios.get(`${config.baseUrl}${config.auditLogExportEndpoint}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      responseType: 'arraybuffer',
    });
    
    const outputFile = path.join(config.outputDir, `audit_logs_${Date.now()}.csv`);
    fs.writeFileSync(outputFile, response.data);
    
    log(`成功导出审计日志! 文件保存在: ${outputFile}`, 'success');
    
    // 读取CSV文件的前几行以显示示例
    const fileContent = fs.readFileSync(outputFile, 'utf8');
    const lines = fileContent.split('\n').slice(0, 6);
    log('导出文件预览:');
    lines.forEach(line => console.log(`  ${line}`));
    
    return outputFile;
  } catch (error) {
    log(`导出审计日志失败: ${error.message}`, 'error');
    throw error;
  }
}

// 主测试函数
async function runTests() {
  log('开始审计日志API测试', 'info');
  try {
    // 1. 认证
    const { accessToken, userId } = await authenticate();
    
    // 2. 测试获取审计日志列表
    const logs = await testGetAuditLogs(accessToken);
    
    // 3. 如果有日志，测试获取详情
    if (logs && logs.length > 0) {
      const selectedLog = logs[0];
      await testGetAuditLogDetails(accessToken, selectedLog._id);
    } else {
      log('没有找到审计日志记录，跳过详情测试', 'warn');
    }
    
    // 4. 测试获取用户操作历史
    await testGetUserHistory(accessToken, userId);
    
    // 5. 测试获取审计日志摘要
    await testGetAuditLogSummary(accessToken);
    
    // 6. 测试导出审计日志
    await testExportAuditLogs(accessToken);
    
    log('所有测试已完成!', 'success');
    log('测试结果摘要:');
    log('✓ 获取审计日志列表: 成功', 'success');
    log('✓ 获取审计日志详情: 成功', 'success');
    log('✓ 获取用户操作历史: 成功', 'success');
    log('✓ 获取审计日志摘要: 成功', 'success');
    log('✓ 导出审计日志: 成功', 'success');
    
  } catch (error) {
    log(`测试过程中出现错误: ${error.message}`, 'error');
    console.error(error);
    process.exit(1);
  }
}

// 运行测试
runTests(); 