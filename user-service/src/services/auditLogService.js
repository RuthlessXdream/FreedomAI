const AuditLog = require('../models/AuditLog');

/**
 * 记录审计日志
 * @param {Object} data - 日志数据
 * @param {String} data.userId - 执行操作的用户ID
 * @param {String} data.username - 执行操作的用户名
 * @param {String} data.action - 操作类型，必须是AuditLog模型中定义的enum值之一
 * @param {String} data.targetId - 操作目标用户ID（如有）
 * @param {String} data.targetUsername - 操作目标用户名（如有）
 * @param {Object} data.details - 操作详情，可以包含任何相关信息
 * @param {String} data.ipAddress - 执行操作的IP地址
 * @param {String} data.userAgent - 执行操作的浏览器/设备信息
 * @returns {Promise<Object>} 创建的审计日志对象
 */
exports.createLog = async (data) => {
  try {
    // 强制要求必填字段
    if (!data.userId || !data.username || !data.action || !data.ipAddress) {
      throw new Error('审计日志缺少必要字段');
    }
    
    // 创建并保存审计日志
    const auditLog = new AuditLog(data);
    await auditLog.save();
    
    return auditLog;
  } catch (error) {
    console.error('审计日志创建错误:', error);
    // 不抛出错误，防止主业务流程中断
  }
};

/**
 * 获取审计日志列表
 * @param {Object} filters - 筛选条件
 * @param {Number} page - 页码
 * @param {Number} limit - 每页记录数
 * @returns {Promise<Object>} 包含日志列表和分页信息的对象
 */
exports.getLogs = async (filters = {}, page = 1, limit = 20) => {
  try {
    const skip = (page - 1) * limit;
    
    // 构建筛选条件
    const query = {};
    
    if (filters.userId) query.userId = filters.userId;
    if (filters.action) query.action = filters.action;
    if (filters.targetId) query.targetId = filters.targetId;
    
    // 日期范围筛选
    if (filters.fromDate || filters.toDate) {
      query.createdAt = {};
      
      if (filters.fromDate) {
        query.createdAt.$gte = new Date(filters.fromDate);
      }
      
      if (filters.toDate) {
        query.createdAt.$lte = new Date(filters.toDate);
      }
    }
    
    // 执行查询并计数
    const logs = await AuditLog.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await AuditLog.countDocuments(query);
    
    return {
      logs,
      pagination: {
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        limit
      }
    };
  } catch (error) {
    console.error('获取审计日志错误:', error);
    throw error;
  }
};

/**
 * 获取单个审计日志详情
 * @param {String} logId - 日志ID
 * @returns {Promise<Object>} 日志对象
 */
exports.getLogById = async (logId) => {
  try {
    return await AuditLog.findById(logId);
  } catch (error) {
    console.error('获取审计日志详情错误:', error);
    throw error;
  }
};

/**
 * 获取用户操作历史
 * @param {String} userId - 用户ID
 * @param {Number} limit - 获取记录数量
 * @returns {Promise<Array>} 用户操作历史记录
 */
exports.getUserHistory = async (userId, limit = 10) => {
  try {
    const logs = await AuditLog.find({ 
      $or: [
        { userId: userId },
        { targetId: userId }
      ]
    })
      .sort({ createdAt: -1 })
      .limit(limit);
    
    return logs;
  } catch (error) {
    console.error('获取用户历史记录错误:', error);
    throw error;
  }
};

/**
 * 获取指定日期后的活动统计
 * @param {Date} startDate - 起始日期
 * @returns {Promise<Object>} 活动统计
 */
exports.getActivityStats = async (startDate) => {
  try {
    // 获取指定日期后的操作计数
    const stats = await AuditLog.aggregate([
      { 
        $match: { 
          createdAt: { $gte: startDate }
        } 
      },
      { 
        $group: { 
          _id: "$action",
          count: { $sum: 1 }
        } 
      },
      {
        $sort: { count: -1 }
      }
    ]);
    
    // 总操作数
    const totalCount = await AuditLog.countDocuments({
      createdAt: { $gte: startDate }
    });
    
    // 独立用户数
    const uniqueUsers = await AuditLog.distinct('userId', {
      createdAt: { $gte: startDate }
    });
    
    return {
      totalActivities: totalCount,
      uniqueUsers: uniqueUsers.length,
      actionBreakdown: stats
    };
  } catch (error) {
    console.error('获取活动统计错误:', error);
    throw error;
  }
};

/**
 * 获取操作类型分布
 * @returns {Promise<Array>} 操作类型分布
 */
exports.getActionDistribution = async () => {
  try {
    return await AuditLog.aggregate([
      { 
        $group: { 
          _id: "$action",
          count: { $sum: 1 }
        } 
      },
      {
        $sort: { count: -1 }
      }
    ]);
  } catch (error) {
    console.error('获取操作类型分布错误:', error);
    throw error;
  }
}; 