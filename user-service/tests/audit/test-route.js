/**
 * 审计日志API测试路由
 * 
 * 此脚本创建一个临时Express服务器，模拟审计日志API的响应，用于测试
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

// 创建 Express 应用
const app = express();
app.use(express.json());
app.use(cors());

// 模拟数据
const mockLogs = [
  {
    _id: '60d21b4667d0d8992e610c85',
    action: 'USER_LOGIN',
    userId: '60d21b4667d0d8992e610c80',
    username: 'testuser',
    ip: '127.0.0.1',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    details: { success: true },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    _id: '60d21b4667d0d8992e610c86',
    action: 'USER_UPDATE',
    userId: '60d21b4667d0d8992e610c80',
    username: 'testuser',
    ip: '127.0.0.1',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    details: { 
      updates: { username: 'newusername' } 
    },
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString()
  }
];

// 模拟摘要数据
const mockSummary = {
  totalLogs: 2,
  actionCounts: {
    USER_LOGIN: 1,
    USER_UPDATE: 1
  },
  latestActivity: new Date().toISOString(),
  topUsers: [
    { userId: '60d21b4667d0d8992e610c80', username: 'testuser', count: 2 }
  ]
};

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 获取审计摘要 - 特定路由放在前面
app.get('/api/audit-logs/summary', (req, res) => {
  res.json({
    success: true,
    summary: mockSummary
  });
});

// 导出审计日志 - 特定路由放在前面
app.get('/api/audit-logs/export', (req, res) => {
  // 生成 CSV 内容
  const csvHeader = 'ID,Action,User ID,Username,IP,Time\n';
  const csvRows = mockLogs.map(log => 
    `${log._id},${log.action},${log.userId},${log.username},${log.ip},${log.createdAt}`
  ).join('\n');
  const csvContent = csvHeader + csvRows;
  
  // 设置响应头
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=audit_logs.csv');
  
  // 发送 CSV 内容
  res.send(csvContent);
});

// 获取用户操作历史 - 特定路由放在前面
app.get('/api/audit-logs/user/:userId', (req, res) => {
  const logs = mockLogs.filter(log => log.userId === req.params.userId);
  
  res.json({
    success: true,
    count: logs.length,
    logs
  });
});

// 获取单条审计日志 
app.get('/api/audit-logs/:id', (req, res) => {
  const log = mockLogs.find(log => log._id === req.params.id);
  
  if (!log) {
    return res.status(404).json({
      success: false,
      message: '未找到审计日志'
    });
  }
  
  res.json({
    success: true,
    log
  });
});

// 获取审计日志列表
app.get('/api/audit-logs', (req, res) => {
  res.json({
    success: true,
    count: mockLogs.length,
    logs: mockLogs,
    pagination: {
      page: 1,
      limit: 10,
      total: mockLogs.length,
      pages: 1
    }
  });
});

// 启动服务器
const PORT = process.env.PORT || 3003;
app.listen(PORT, () => {
  console.log(`\x1b[32m%s\x1b[0m`, `[SUCCESS] 测试服务器运行在端口 ${PORT}`);
  console.log(`\x1b[36m%s\x1b[0m`, '[INFO] 可以通过以下URL测试审计日志API:');
  console.log(`\x1b[33m%s\x1b[0m`, `http://localhost:${PORT}/api/audit-logs`);
  console.log(`\x1b[33m%s\x1b[0m`, `http://localhost:${PORT}/api/audit-logs/60d21b4667d0d8992e610c85`);
  console.log(`\x1b[33m%s\x1b[0m`, `http://localhost:${PORT}/api/audit-logs/user/60d21b4667d0d8992e610c80`);
  console.log(`\x1b[33m%s\x1b[0m`, `http://localhost:${PORT}/api/audit-logs/summary`);
  console.log(`\x1b[33m%s\x1b[0m`, `http://localhost:${PORT}/api/audit-logs/export`);
}); 