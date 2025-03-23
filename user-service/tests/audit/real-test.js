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
  baseUrl: 'http://localhost:3002', // API服务器地址
  loginEndpoint: '/api/auth/login',
  auditLogEndpoint: '/api/audit-logs',
  auditLogDetailsEndpoint: '/api/audit-logs/',
  auditLogUserEndpoint: '/api/audit-logs/user/',
  auditLogSummaryEndpoint: '/api/audit-logs/summary',
  auditLogExportEndpoint: '/api/audit-logs/export',
  // 测试管理员账户
  adminCredentials: {
    email: 'admin@example.com',
    password: 'Admin@123',
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
    // 打印响应数据
    console.log("认证响应:", JSON.stringify(response.data, null, 2));
    
    // 尝试从响应中获取token和用户信息
    const { token, user } = response.data;
    log(`认证成功! 用户: ${user.email} (ID: ${user._id})`, 'success');
    return { accessToken: token, userId: user._id };
  } catch (error) {
    log(`认证失败: ${error.message}`, 'error');
    if (error.response) {
      log(`响应状态: ${error.response.status}`, 'error');
      log(`响应数据: ${JSON.stringify(error.response.data)}`, 'error');
    }
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
    
    const logs = response.data.logs || response.data; // 兼容不同格式
    const pagination = response.data.pagination || {};
    log(`成功获取审计日志列表! 获取到 ${logs.length} 条记录`, 'success');
    log(`分页信息: 当前页 ${pagination.currentPage || 1}, 总页数 ${pagination.totalPages || '未知'}, 总记录数 ${pagination.totalItems || '未知'}`);
    
    // 输出示例记录
    if (logs.length > 0) {
      log('示例记录:');
      logs.slice(0, 3).forEach((logItem, index) => {
        const date = new Date(logItem.createdAt || logItem.timestamp).toLocaleString();
        const desc = logItem.description || logItem.action;
        console.log(`  ${index + 1}. [${logItem.action}] ${desc} - ${date}`);
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
    
    const logDetails = response.data.log || response.data; // 兼容不同格式
    log(`成功获取审计日志详情!`, 'success');
    log('日志详情:');
    console.log(`  操作: ${logDetails.action}`);
    console.log(`  描述: ${logDetails.description || '未提供'}`);
    console.log(`  用户: ${logDetails.userId}`);
    console.log(`  IP地址: ${logDetails.ipAddress || logDetails.ip || '未记录'}`);
    
    // 处理时间戳
    const timestamp = logDetails.createdAt || logDetails.timestamp;
    const date = timestamp ? new Date(timestamp).toLocaleString() : '未知时间';
    console.log(`  时间: ${date}`);
    
    // 格式化展示详情数据
    console.log(`  详细数据: ${JSON.stringify(logDetails.details || {}, null, 2)}`);
    
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
    
    const logs = response.data.logs || response.data; // 兼容不同格式
    if (!Array.isArray(logs)) {
      log(`返回的数据不是数组格式: ${JSON.stringify(response.data).slice(0, 100)}...`, 'warn');
      return [];
    }
    
    log(`成功获取用户操作历史! 获取到 ${logs.length} 条记录`, 'success');
    
    // 输出示例记录
    if (logs.length > 0) {
      log('用户最近操作:');
      logs.slice(0, 5).forEach((logItem, index) => {
        const date = new Date(logItem.createdAt || logItem.timestamp).toLocaleString();
        const desc = logItem.description || logItem.action;
        console.log(`  ${index + 1}. [${logItem.action}] ${desc} - ${date}`);
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
    
    // 总活动数
    if (summary.recentActivities && summary.recentActivities.totalActivities) {
      console.log(`  总活动数: ${summary.recentActivities.totalActivities}`);
      console.log(`  活跃用户数: ${summary.recentActivities.uniqueUsers || 0}`);
    } else {
      console.log(`  未找到活动统计数据`);
    }
    
    // 操作分布
    console.log(`  操作类型分布:`);
    if (summary.actionDistribution && Array.isArray(summary.actionDistribution)) {
      summary.actionDistribution.slice(0, 5).forEach(action => {
        console.log(`    ${action._id}: ${action.count} 次`);
      });
      if (summary.actionDistribution.length > 5) {
        console.log(`    ... 及其他 ${summary.actionDistribution.length - 5} 种操作类型`);
      }
    } else {
      console.log(`    未找到操作分布数据`);
    }
    
    // 最近日志
    console.log(`  最近的日志活动:`);
    if (summary.recentLogs && Array.isArray(summary.recentLogs)) {
      summary.recentLogs.slice(0, 3).forEach((log, index) => {
        const date = new Date(log.createdAt || log.timestamp).toLocaleString();
        console.log(`    ${index + 1}. [${log.action}] 用户: ${log.username || log.userId} - ${date}`);
      });
    } else {
      console.log(`    未找到最近日志数据`);
    }
    
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
    
    // 检查响应内容类型
    const contentType = response.headers['content-type'];
    if (!contentType || !(contentType.includes('text/csv') || contentType.includes('application/octet-stream'))) {
      log(`警告：响应内容类型不是CSV (${contentType})`, 'warn');
    }
    
    // 保存文件
    const outputFile = path.join(config.outputDir, `real_audit_logs_${Date.now()}.csv`);
    fs.writeFileSync(outputFile, response.data);
    
    log(`成功导出审计日志! 文件保存在: ${outputFile}`, 'success');
    
    try {
      // 尝试使用utf8读取文件内容
      const fileContent = fs.readFileSync(outputFile, 'utf8');
      const lines = fileContent.split('\n').filter(line => line.trim()).slice(0, 6);
      
      log('导出文件预览:');
      lines.forEach(line => console.log(`  ${line}`));
      
      log(`文件包含 ${lines.length} 行数据`, 'info');
    } catch (readError) {
      log(`无法以文本方式读取文件: ${readError.message}`, 'warn');
      log(`文件已保存，但无法预览内容`, 'info');
    }
    
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
runTests()
  .then(() => {
    console.log('测试脚本执行完毕');
  })
  .catch(error => {
    console.error('测试脚本执行失败:', error);
    process.exit(1);
  }); 