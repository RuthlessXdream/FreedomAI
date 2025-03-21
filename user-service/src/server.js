const app = require('./app');
const dotenv = require('dotenv');

// 加载环境变量
dotenv.config();

// 设置未捕获异常处理
process.on('uncaughtException', err => {
  console.error('未捕获的异常! 正在关闭服务...');
  console.error(err.name, err.message);
  process.exit(1);
});

// 获取端口
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || 'localhost';

// 启动服务器
const server = app.listen(PORT, () => {
  console.log(`
=================================================
 用户服务已启动！
 环境: ${process.env.NODE_ENV}
 监听: http://${HOST}:${PORT}
=================================================
  `);
});

// 设置未处理的Promise拒绝处理
process.on('unhandledRejection', err => {
  console.error('未处理的Promise拒绝! 正在关闭服务...');
  console.error(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});
