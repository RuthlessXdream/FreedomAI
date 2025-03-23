/**
 * 审计日志API性能测试脚本
 * 测试审计日志API在高负载下的性能表现
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');
const crypto = require('crypto');

// 配置
const config = {
  baseUrl: 'http://localhost:3000', // API服务器地址
  loginEndpoint: '/api/auth/login',
  auditLogEndpoint: '/api/audit-logs',
  auditLogDetailsEndpoint: '/api/audit-logs/',
  auditLogUserEndpoint: '/api/audit-logs/user/',
  auditLogSummaryEndpoint: '/api/audit-logs/summary',
  auditLogExportEndpoint: '/api/audit-logs/export',
  // 测试管理员账户，需要有权限访问审计日志API
  adminCredentials: {
    email: 'admin@example.com',
    password: 'admin123',
  },
  testIterations: 50, // 每个API的测试次数
  concurrentRequests: 5, // 并发请求数
  outputDir: path.join(__dirname, 'output'),
  outputFile: `performance_test_${Date.now()}.json`,
};

// 确保输出目录存在
if (!fs.existsSync(config.outputDir)) {
  fs.mkdirSync(config.outputDir, { recursive: true });
}

// 保存性能测试结果
const results = {
  testDate: new Date().toISOString(),
  environment: process.env.NODE_ENV || 'development',
  summary: {},
  details: [],
};

// 帮助函数 - 生成随机用户ID
function generateRandomUserId() {
  return crypto.randomBytes(12).toString('hex');
}

// 帮助函数 - 计算统计数据
function calculateStats(times) {
  const sortedTimes = [...times].sort((a, b) => a - b);
  const total = sortedTimes.reduce((sum, time) => sum + time, 0);
  const avg = total / sortedTimes.length;
  const min = sortedTimes[0];
  const max = sortedTimes[sortedTimes.length - 1];
  const median = sortedTimes[Math.floor(sortedTimes.length / 2)];
  
  // 计算95%的百分位
  const p95Index = Math.ceil(sortedTimes.length * 0.95) - 1;
  const p95 = sortedTimes[p95Index];
  
  return {
    avg,
    min,
    max,
    median,
    p95,
    total,
    count: sortedTimes.length,
  };
}

// 帮助函数 - 延迟执行
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 认证并获取访问令牌
async function authenticate() {
  try {
    console.log('尝试认证...');
    const response = await axios.post(`${config.baseUrl}${config.loginEndpoint}`, config.adminCredentials);
    const { accessToken } = response.data;
    console.log('认证成功');
    return accessToken;
  } catch (error) {
    console.error('认证失败:', error.message);
    throw new Error('无法获取访问令牌');
  }
}

// 执行单个请求并测量响应时间
async function executeRequest(accessToken, endpoint, method = 'get', data = null) {
  const startTime = performance.now();
  try {
    const options = {
      method,
      url: `${config.baseUrl}${endpoint}`,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    };
    
    if (data) {
      options.data = data;
    }
    
    const response = await axios(options);
    const endTime = performance.now();
    return {
      success: true,
      duration: endTime - startTime,
      status: response.status,
      dataSize: JSON.stringify(response.data).length,
    };
  } catch (error) {
    const endTime = performance.now();
    return {
      success: false,
      duration: endTime - startTime,
      status: error.response ? error.response.status : 0,
      error: error.message,
    };
  }
}

// 测试获取审计日志列表
async function testGetAuditLogs(accessToken) {
  console.log('测试获取审计日志列表...');
  const times = [];
  const apiResults = [];
  
  // 使用不同的分页参数
  const pageParams = [
    '',
    '?page=1&limit=10',
    '?page=1&limit=50',
    '?page=2&limit=20',
  ];
  
  for (let i = 0; i < config.testIterations; i++) {
    const pageParam = pageParams[i % pageParams.length];
    const result = await executeRequest(accessToken, `${config.auditLogEndpoint}${pageParam}`);
    times.push(result.duration);
    apiResults.push(result);
    
    // 小延迟避免API限制
    await sleep(50);
  }
  
  const stats = calculateStats(times);
  console.log(`审计日志列表API - 平均响应时间: ${stats.avg.toFixed(2)}ms`);
  
  return { stats, apiResults };
}

// 测试获取审计日志详情
async function testGetAuditLogDetails(accessToken, logIds) {
  console.log('测试获取审计日志详情...');
  const times = [];
  const apiResults = [];
  
  for (let i = 0; i < Math.min(config.testIterations, logIds.length); i++) {
    const logId = logIds[i % logIds.length];
    const result = await executeRequest(accessToken, `${config.auditLogDetailsEndpoint}${logId}`);
    times.push(result.duration);
    apiResults.push(result);
    
    // 小延迟避免API限制
    await sleep(50);
  }
  
  const stats = calculateStats(times);
  console.log(`审计日志详情API - 平均响应时间: ${stats.avg.toFixed(2)}ms`);
  
  return { stats, apiResults };
}

// 测试获取用户操作历史
async function testGetUserHistory(accessToken, userIds) {
  console.log('测试获取用户操作历史...');
  const times = [];
  const apiResults = [];
  
  for (let i = 0; i < config.testIterations; i++) {
    const userId = userIds[i % userIds.length] || generateRandomUserId();
    const result = await executeRequest(accessToken, `${config.auditLogUserEndpoint}${userId}`);
    times.push(result.duration);
    apiResults.push(result);
    
    // 小延迟避免API限制
    await sleep(50);
  }
  
  const stats = calculateStats(times);
  console.log(`用户操作历史API - 平均响应时间: ${stats.avg.toFixed(2)}ms`);
  
  return { stats, apiResults };
}

// 测试获取审计日志摘要
async function testGetAuditLogSummary(accessToken) {
  console.log('测试获取审计日志摘要...');
  const times = [];
  const apiResults = [];
  
  for (let i = 0; i < config.testIterations; i++) {
    const result = await executeRequest(accessToken, config.auditLogSummaryEndpoint);
    times.push(result.duration);
    apiResults.push(result);
    
    // 小延迟避免API限制
    await sleep(50);
  }
  
  const stats = calculateStats(times);
  console.log(`审计日志摘要API - 平均响应时间: ${stats.avg.toFixed(2)}ms`);
  
  return { stats, apiResults };
}

// 测试导出审计日志
async function testExportAuditLogs(accessToken) {
  console.log('测试导出审计日志...');
  const times = [];
  const apiResults = [];
  
  // 使用不同的查询参数
  const queryParams = [
    '',
    '?startDate=' + new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    '?endDate=' + new Date().toISOString(),
    '?startDate=' + new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() + 
    '&endDate=' + new Date().toISOString(),
  ];
  
  for (let i = 0; i < config.testIterations; i++) {
    const queryParam = queryParams[i % queryParams.length];
    const result = await executeRequest(accessToken, `${config.auditLogExportEndpoint}${queryParam}`);
    times.push(result.duration);
    apiResults.push(result);
    
    // 小延迟避免API限制
    await sleep(100);
  }
  
  const stats = calculateStats(times);
  console.log(`审计日志导出API - 平均响应时间: ${stats.avg.toFixed(2)}ms`);
  
  return { stats, apiResults };
}

// 执行并发测试
async function runConcurrentTest(testFunction, accessToken, ...args) {
  const allPromises = [];
  
  for (let i = 0; i < config.concurrentRequests; i++) {
    allPromises.push(testFunction(accessToken, ...args));
  }
  
  const results = await Promise.all(allPromises);
  
  // 合并结果
  const mergedTimes = results.flatMap(r => r.apiResults.map(ar => ar.duration));
  const mergedResults = results.flatMap(r => r.apiResults);
  
  return {
    stats: calculateStats(mergedTimes),
    apiResults: mergedResults,
  };
}

// 主函数
async function runPerformanceTests() {
  try {
    console.log('开始审计日志API性能测试');
    console.log(`配置: ${config.testIterations}次迭代, ${config.concurrentRequests}个并发请求`);
    
    const startTime = performance.now();
    
    // 获取访问令牌
    const accessToken = await authenticate();
    
    // 获取一些审计日志条目以获取真实ID
    const initialLogsResponse = await axios.get(`${config.baseUrl}${config.auditLogEndpoint}?limit=50`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    
    // 提取日志ID和用户ID用于后续测试
    const logIds = initialLogsResponse.data.logs.map(log => log._id);
    const userIds = [...new Set(initialLogsResponse.data.logs.map(log => log.userId))];
    
    console.log(`获取到 ${logIds.length} 个日志ID和 ${userIds.length} 个用户ID供测试使用`);
    
    // 测试各个API端点
    console.log('\n=== 串行测试 ===');
    results.details.push({
      name: '获取审计日志列表',
      ...await testGetAuditLogs(accessToken),
    });
    
    results.details.push({
      name: '获取审计日志详情',
      ...await testGetAuditLogDetails(accessToken, logIds),
    });
    
    results.details.push({
      name: '获取用户操作历史',
      ...await testGetUserHistory(accessToken, userIds),
    });
    
    results.details.push({
      name: '获取审计日志摘要',
      ...await testGetAuditLogSummary(accessToken),
    });
    
    results.details.push({
      name: '导出审计日志',
      ...await testExportAuditLogs(accessToken),
    });
    
    console.log('\n=== 并发测试 ===');
    results.details.push({
      name: '并发获取审计日志列表',
      ...await runConcurrentTest(testGetAuditLogs, accessToken),
    });
    
    results.details.push({
      name: '并发获取审计日志详情',
      ...await runConcurrentTest(testGetAuditLogDetails, accessToken, logIds),
    });
    
    results.details.push({
      name: '并发获取用户操作历史',
      ...await runConcurrentTest(testGetUserHistory, accessToken, userIds),
    });
    
    results.details.push({
      name: '并发获取审计日志摘要',
      ...await runConcurrentTest(testGetAuditLogSummary, accessToken),
    });
    
    const endTime = performance.now();
    const totalTestTime = endTime - startTime;
    
    // 计算总结统计数据
    results.summary = {
      totalTestTime,
      averageResponseTimes: {},
      successRates: {},
    };
    
    results.details.forEach(detail => {
      results.summary.averageResponseTimes[detail.name] = detail.stats.avg;
      
      const successfulRequests = detail.apiResults.filter(r => r.success).length;
      results.summary.successRates[detail.name] = (successfulRequests / detail.apiResults.length) * 100;
    });
    
    // 保存结果到文件
    const outputPath = path.join(config.outputDir, config.outputFile);
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
    
    console.log('\n=== 测试完成 ===');
    console.log(`总测试时间: ${(totalTestTime / 1000).toFixed(2)}秒`);
    console.log(`测试结果已保存到: ${outputPath}`);
    
    // 生成人类可读的摘要
    generateHumanReadableSummary(results);
    
  } catch (error) {
    console.error('性能测试失败:', error);
  }
}

// 生成人类可读的摘要报告
function generateHumanReadableSummary(results) {
  const summaryPath = path.join(config.outputDir, `performance_summary_${Date.now()}.txt`);
  
  let summaryContent = `
=======================================
审计日志API性能测试摘要
=======================================
测试日期: ${results.testDate}
环境: ${results.environment}
总测试时间: ${(results.summary.totalTestTime / 1000).toFixed(2)}秒

API响应时间 (毫秒):
`;
  
  Object.entries(results.summary.averageResponseTimes).forEach(([name, avg]) => {
    const detail = results.details.find(d => d.name === name);
    summaryContent += `
${name}:
  平均: ${avg.toFixed(2)}ms
  最小: ${detail.stats.min.toFixed(2)}ms
  最大: ${detail.stats.max.toFixed(2)}ms
  中位数: ${detail.stats.median.toFixed(2)}ms
  95%: ${detail.stats.p95.toFixed(2)}ms
  成功率: ${results.summary.successRates[name].toFixed(2)}%
`;
  });
  
  summaryContent += `
=======================================
测试配置:
  迭代次数: ${config.testIterations}
  并发请求: ${config.concurrentRequests}
=======================================
`;
  
  fs.writeFileSync(summaryPath, summaryContent);
  console.log(`人类可读的摘要已保存到: ${summaryPath}`);
}

// 运行测试
runPerformanceTests(); 