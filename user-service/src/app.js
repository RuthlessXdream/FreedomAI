const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');

// 路由
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');

// 加载环境变量
dotenv.config();

// 连接数据库 - 修改为非阻塞方式，即使数据库连接失败也可以启动服务
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('数据库连接成功'))
  .catch(err => {
    console.error('数据库连接失败:', err.message);
    console.warn('服务将以受限模式运行，某些功能可能不可用');
    // 不立即退出，允许服务继续运行
  });

// 初始化Express应用
const app = express();

// 安全中间件
app.use(helmet());

// CORS配置
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// 请求限流
const limiter = rateLimit({
  windowMs: process.env.RATE_LIMIT_WINDOW * 60 * 1000 || 15 * 60 * 1000, // 默认15分钟
  max: process.env.RATE_LIMIT_MAX || 100, // 默认每个IP在windowMs内最多100次请求
  message: {
    success: false,
    message: '请求过于频繁，请稍后再试'
  }
});

// 对认证路由应用限流
app.use('/api/auth', limiter);

// 日志中间件
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// 解析请求体
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// API路由
const apiPrefix = process.env.API_PREFIX || '/api';
app.use(`${apiPrefix}/auth`, authRoutes);
app.use(`${apiPrefix}/users`, userRoutes);

// 健康检查路由
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    service: 'user-service',
    status: 'up',
    timestamp: new Date()
  });
});

// 404处理
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `找不到路由: ${req.originalUrl}`
  });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || '服务器内部错误',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

module.exports = app;
