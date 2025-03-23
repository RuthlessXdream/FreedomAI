const auditLogService = require('../services/auditLogService');

// @desc    获取审计日志列表
// @route   GET /api/audit-logs
// @access  Private/Admin
exports.getAuditLogs = async (req, res) => {
  try {
    // 分页参数
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    
    // 筛选条件
    const filters = {
      userId: req.query.userId,
      action: req.query.action,
      targetId: req.query.targetId,
      fromDate: req.query.fromDate,
      toDate: req.query.toDate
    };
    
    // 获取日志
    const result = await auditLogService.getLogs(filters, page, limit);
    
    res.status(200).json({
      success: true,
      count: result.logs.length,
      pagination: result.pagination,
      logs: result.logs
    });
  } catch (error) {
    console.error('获取审计日志错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    获取单个审计日志详情
// @route   GET /api/audit-logs/:id
// @access  Private/Admin
exports.getAuditLogById = async (req, res) => {
  try {
    const log = await auditLogService.getLogById(req.params.id);
    
    if (!log) {
      return res.status(404).json({
        success: false,
        message: '审计日志不存在'
      });
    }
    
    res.status(200).json({
      success: true,
      log
    });
  } catch (error) {
    console.error('获取审计日志详情错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    获取用户操作历史
// @route   GET /api/audit-logs/user/:userId
// @access  Private/Admin
exports.getUserHistory = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 20;
    const logs = await auditLogService.getUserHistory(req.params.userId, limit);
    
    res.status(200).json({
      success: true,
      count: logs.length,
      logs
    });
  } catch (error) {
    console.error('获取用户历史记录错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    获取系统操作摘要（最近活动、统计等）
// @route   GET /api/audit-logs/summary
// @access  Private/Admin
exports.getAuditSummary = async (req, res) => {
  try {
    // 获取过去24小时的活动计数
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentActivities = await auditLogService.getActivityStats(last24Hours);
    
    // 获取操作类型分布
    const actionDistribution = await auditLogService.getActionDistribution();
    
    // 获取最近10条日志
    const recentLogs = await auditLogService.getLogs({}, 1, 10);
    
    res.status(200).json({
      success: true,
      summary: {
        recentActivities,
        actionDistribution,
        recentLogs: recentLogs.logs
      }
    });
  } catch (error) {
    console.error('获取审计摘要错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    导出审计日志（CSV格式）
// @route   GET /api/audit-logs/export
// @access  Private/Admin
exports.exportAuditLogs = async (req, res) => {
  try {
    // 筛选条件
    const filters = {
      userId: req.query.userId,
      action: req.query.action,
      targetId: req.query.targetId,
      fromDate: req.query.fromDate,
      toDate: req.query.toDate
    };
    
    // 获取要导出的日志（最多1000条）
    const result = await auditLogService.getLogs(filters, 1, 1000);
    const logs = result.logs;
    
    if (logs.length === 0) {
      return res.status(404).json({
        success: false,
        message: '没有符合条件的日志可导出'
      });
    }
    
    // 创建CSV头
    let csv = '时间戳,用户ID,用户名,操作,目标ID,目标用户名,IP地址,用户代理\n';
    
    // 添加日志数据
    logs.forEach(log => {
      csv += `"${log.createdAt}","${log.userId}","${log.username}","${log.action}","${log.targetId || ''}","${log.targetUsername || ''}","${log.ipAddress}","${log.userAgent || ''}"\n`;
    });
    
    // 设置响应头
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=audit_logs.csv');
    
    // 发送CSV数据
    res.status(200).send(csv);
  } catch (error) {
    console.error('导出审计日志错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}; 