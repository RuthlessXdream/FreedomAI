const auditLogService = require('../services/auditLogService');

/**
 * 创建审计日志中间件
 * @param {String} action - 要记录的操作类型
 * @returns {Function} Express中间件函数
 */
const createAuditLog = (action) => {
  return async (req, res, next) => {
    // 保存原始的res.json方法
    const originalJson = res.json;
    
    // 获取客户端IP
    const ipAddress = 
      req.headers['x-forwarded-for'] || 
      req.connection.remoteAddress || 
      req.socket.remoteAddress || 
      req.ip;
    
    // 获取操作者信息（已认证用户）
    const userId = req.user ? req.user.id : null;
    const username = req.user ? req.user.username : 'anonymous';
    
    // 替换res.json以便在请求结束后记录日志
    res.json = function(data) {
      // 恢复原始方法
      res.json = originalJson;
      
      // 调用原始方法返回响应
      res.json(data);
      
      // 请求成功时记录审计日志（状态码2xx）
      if (res.statusCode >= 200 && res.statusCode < 300 && userId) {
        // 准备记录日志
        const logData = {
          userId,
          username,
          action,
          ipAddress,
          userAgent: req.headers['user-agent'] || '',
          // 操作目标信息
          targetId: req.params.id,
          // 包含请求详情但排除敏感信息
          details: {
            method: req.method,
            url: req.originalUrl,
            body: sanitizeRequestBody(req.body),
            params: req.params,
            query: req.query,
            // 包含一些响应信息，但排除大型或敏感数据
            response: {
              statusCode: res.statusCode,
              success: data.success
            }
          }
        };
        
        // 记录审计日志
        auditLogService.createLog(logData)
          .catch(err => console.error('记录审计日志失败:', err));
      }
    };
    
    next();
  };
};

/**
 * 过滤请求体中的敏感字段
 * @param {Object} body - 请求体对象
 * @returns {Object} 过滤后的请求体
 */
const sanitizeRequestBody = (body) => {
  if (!body) return {};
  
  // 创建一个深拷贝
  const sanitized = JSON.parse(JSON.stringify(body));
  
  // 列出要从日志中删除的敏感字段
  const sensitiveFields = [
    'password', 
    'newPassword', 
    'currentPassword',
    'token', 
    'refreshToken',
    'verificationCode',
    'resetCode',
    'mfaCode',
    'secret'
  ];
  
  // 递归检查和清除敏感字段
  const sanitizeObject = (obj) => {
    if (!obj || typeof obj !== 'object') return;
    
    Object.keys(obj).forEach(key => {
      if (sensitiveFields.includes(key)) {
        // 替换敏感值为[REDACTED]
        obj[key] = '[REDACTED]';
      } else if (typeof obj[key] === 'object') {
        // 递归处理嵌套对象
        sanitizeObject(obj[key]);
      }
    });
  };
  
  sanitizeObject(sanitized);
  return sanitized;
};

module.exports = {
  createAuditLog
}; 