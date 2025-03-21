const jwt = require('jsonwebtoken');
const User = require('../models/User');

// 保护路由 - 需要用户登录
exports.protect = async (req, res, next) => {
  try {
    let token;
    
    // 从请求头或cookies中获取令牌
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      // 从Authorization头获取令牌
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      // 从cookies获取令牌
      token = req.cookies.token;
    }
    
    // 检查令牌是否存在
    if (!token) {
      return res.status(401).json({
        success: false,
        message: '未授权，请登录'
      });
    }
    
    try {
      // 验证令牌
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // 查找用户
      const user = await User.findById(decoded.id);
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: '找不到与此令牌关联的用户'
        });
      }
      
      // 检查用户是否在令牌签发后更改了密码
      if (user.passwordChangedAt) {
        const changedTimestamp = parseInt(user.passwordChangedAt.getTime() / 1000, 10);
        
        // 如果密码在令牌签发后被更改
        if (decoded.iat < changedTimestamp) {
          return res.status(401).json({
            success: false,
            message: '用户最近更改了密码，请重新登录'
          });
        }
      }
      
      // 将用户信息添加到请求对象
      req.user = user;
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: '无效的令牌'
      });
    }
  } catch (error) {
    console.error('认证中间件错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 授权中间件 - 限制对特定角色的访问
exports.authorize = (...roles) => {
  return (req, res, next) => {
    // 检查用户角色是否在允许的角色列表中
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `用户角色 ${req.user.role} 无权执行此操作`
      });
    }
    
    next();
  };
};
