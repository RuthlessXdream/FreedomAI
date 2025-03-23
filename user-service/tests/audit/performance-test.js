/**
 * 测试审计日志API（模拟版本）
 * 
 * 此脚本测试审计日志系统的主要功能，包括:
 * 1. 获取审计日志列表
 * 2. 获取单个日志详情
 * 3. 获取用户操作历史
 * 4. 获取审计摘要
 * 5. 导出审计日志
 * 
 * 注：此版本跳过了认证步骤，直接测试API
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

// 配置
const API_URL = process.env.API_URL || 'http://localhost:3003/api';

// 模拟数据
const MOCK_USER_ID = '60d21b4667d0d8992e610c80';
const TEST_DURATION = 10; // 测试持续时间（秒）
const RESULTS_FILE = path.join(__dirname, 'output', `performance_results_${Date.now()}.json`);

// 彩色日志输出
const log = {
  info: (msg) => console.log('\x1b[36m%s\x1b[0m', `[INFO] ${msg}`),
  success: (msg) => console.log('\x1b[32m%s\x1b[0m', `[SUCCESS] ${msg}`),
  error: (msg) => console.log('\x1b[31m%s\x1b[0m', `[ERROR] ${msg}`),
  warning: (msg) => console.log('\x1b[33m%s\x1b[0m', `[WARN] ${msg}`),
  data: (msg) => console.log('\x1b[90m%s\x1b[0m', msg),
  perf: (msg) => console.log('\x1b[35m%s\x1b[0m', `[PERF] ${msg}`)
};

// 性能测试结果收集
const results = {
  startTime: new Date().toISOString(),
  endTime: null,
  summary: {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    minResponseTime: Number.MAX_SAFE_INTEGER,
    maxResponseTime: 0,
    throughput: 0 // 每秒请求数
  },
  endpoints: {},
  concurrencyResults: {},
  loadResults: []
};

// 记录请求结果
function recordResult(endpoint, responseTime, success, error = null) {
  results.summary.totalRequests++;
  
  if (success) {
    results.summary.successfulRequests++;
  } else {
    results.summary.failedRequests++;
  }
  
  // 更新最小和最大响应时间
  results.summary.minResponseTime = Math.min(results.summary.minResponseTime, responseTime);
  results.summary.maxResponseTime = Math.max(results.summary.maxResponseTime, responseTime);
  
  // 计算新的平均响应时间
  const currentTotal = results.summary.averageResponseTime * (results.summary.totalRequests - 1);
  results.summary.averageResponseTime = (currentTotal + responseTime) / results.summary.totalRequests;
  
  // 记录端点特定的性能数据
  if (!results.endpoints[endpoint]) {
    results.endpoints[endpoint] = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      minResponseTime: Number.MAX_SAFE_INTEGER,
      maxResponseTime: 0,
      errors: []
    };
  }
  
  results.endpoints[endpoint].totalRequests++;
  
  if (success) {
    results.endpoints[endpoint].successfulRequests++;
  } else {
    results.endpoints[endpoint].failedRequests++;
    results.endpoints[endpoint].errors.push({
      time: new Date().toISOString(),
      error: error.toString()
    });
  }
  
  // 更新端点的响应时间统计
  results.endpoints[endpoint].minResponseTime = Math.min(
    results.endpoints[endpoint].minResponseTime, 
    responseTime
  );
  results.endpoints[endpoint].maxResponseTime = Math.max(
    results.endpoints[endpoint].maxResponseTime, 
    responseTime
  );
  
  const currentEndpointTotal = results.endpoints[endpoint].averageResponseTime * 
                              (results.endpoints[endpoint].totalRequests - 1);
  results.endpoints[endpoint].averageResponseTime = 
    (currentEndpointTotal + responseTime) / results.endpoints[endpoint].totalRequests;
}

// 发送单个请求并测量性能
async function makeRequest(endpoint, method = 'GET', data = null) {
  const startTime = performance.now();
  let success = false;
  let error = null;
  
  try {
    const config = {};
    if (endpoint.includes('export')) {
      config.responseType = 'blob';
    }
    
    let response;
    if (method === 'GET') {
      response = await axios.get(`${API_URL}${endpoint}`, config);
    } else if (method === 'POST') {
      response = await axios.post(`${API_URL}${endpoint}`, data, config);
    }
    
    success = response.status === 200;
  } catch (err) {
    error = err.message;
  }
  
  const endTime = performance.now();
  const responseTime = endTime - startTime;
  
  recordResult(endpoint, responseTime, success, error);
  
  return {
    success,
    responseTime,
    error
  };
}

// 并发测试 - 同时发送多个请求
async function concurrencyTest(endpoint, concurrentRequests) {
  log.info(`开始并发测试: ${endpoint} (${concurrentRequests} 个并发请求)`);
  
  const startTime = performance.now();
  const promises = [];
  
  for (let i = 0; i < concurrentRequests; i++) {
    promises.push(makeRequest(endpoint));
  }
  
  await Promise.all(promises);
  
  const endTime = performance.now();
  const totalTime = endTime - startTime;
  
  log.perf(`${concurrentRequests}个并发请求完成，总耗时: ${totalTime.toFixed(2)}ms`);
  log.perf(`平均每个请求: ${(totalTime / concurrentRequests).toFixed(2)}ms`);
  
  // 记录并发测试结果
  if (!results.concurrencyResults[endpoint]) {
    results.concurrencyResults[endpoint] = [];
  }
  
  results.concurrencyResults[endpoint].push({
    concurrentRequests,
    totalTime,
    averageTime: totalTime / concurrentRequests,
    timestamp: new Date().toISOString()
  });
}

// 负载测试 - 在固定时间内不断发送请求
async function loadTest(endpoint, duration) {
  log.info(`开始负载测试: ${endpoint} (持续 ${duration} 秒)`);
  
  const startTime = performance.now();
  const endTimeTarget = startTime + (duration * 1000);
  let requestCount = 0;
  
  while (performance.now() < endTimeTarget) {
    await makeRequest(endpoint);
    requestCount++;
    
    // 每10个请求输出一次状态
    if (requestCount % 10 === 0) {
      const elapsedTime = performance.now() - startTime;
      const requestsPerSecond = (requestCount / elapsedTime) * 1000;
      log.data(`已发送 ${requestCount} 个请求 (${requestsPerSecond.toFixed(2)} 请求/秒)`);
    }
  }
  
  const endTime = performance.now();
  const totalTime = endTime - startTime;
  const requestsPerSecond = (requestCount / totalTime) * 1000;
  
  log.perf(`负载测试完成，总共发送 ${requestCount} 个请求`);
  log.perf(`平均每秒 ${requestsPerSecond.toFixed(2)} 个请求`);
  
  // 记录负载测试结果
  results.loadResults.push({
    endpoint,
    duration,
    requestCount,
    requestsPerSecond,
    timestamp: new Date().toISOString()
  });
}

// 保存测试结果
function saveResults() {
  // 确保输出目录存在
  const outputDir = path.dirname(RESULTS_FILE);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // 计算吞吐量
  const testDuration = (new Date(results.endTime) - new Date(results.startTime)) / 1000;
  results.summary.throughput = results.summary.totalRequests / testDuration;
  
  // 保存结果
  fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
  log.success(`性能测试结果已保存至: ${RESULTS_FILE}`);
}

// 执行所有性能测试
async function runPerformanceTests() {
  try {
    log.info('=== 开始审计日志API性能测试 ===');
    log.info(`测试持续时间: ${TEST_DURATION}秒`);
    log.info(`结果将保存至: ${RESULTS_FILE}`);
    log.info('');
    
    // 1. 简单请求响应时间测试
    log.info('1. 单一请求响应时间基准测试');
    await makeRequest('/audit-logs');
    await makeRequest('/audit-logs/summary');
    await makeRequest(`/audit-logs/user/${MOCK_USER_ID}`);
    
    // 2. 并发测试 (不同级别的并发)
    log.info('');
    log.info('2. 并发处理能力测试');
    const concurrencyLevels = [5, 10, 20];
    for (const level of concurrencyLevels) {
      await concurrencyTest('/audit-logs', level);
    }
    
    // 3. 负载测试
    log.info('');
    log.info('3. 持续负载测试');
    await loadTest('/audit-logs', TEST_DURATION);
    
    // 完成测试
    results.endTime = new Date().toISOString();
    log.info('');
    log.info('=== 性能测试结束 ===');
    
    // 输出总结
    log.info('');
    log.info('=== 性能测试摘要 ===');
    log.info(`总请求数: ${results.summary.totalRequests}`);
    log.info(`成功请求: ${results.summary.successfulRequests}`);
    log.info(`失败请求: ${results.summary.failedRequests}`);
    log.info(`平均响应时间: ${results.summary.averageResponseTime.toFixed(2)}ms`);
    log.info(`最快响应时间: ${results.summary.minResponseTime.toFixed(2)}ms`);
    log.info(`最慢响应时间: ${results.summary.maxResponseTime.toFixed(2)}ms`);
    
    // 保存结果
    saveResults();
    
  } catch (error) {
    log.error(`测试过程中发生未处理的错误: ${error.message}`);
    console.error(error);
  }
}

// 运行性能测试
runPerformanceTests(); 