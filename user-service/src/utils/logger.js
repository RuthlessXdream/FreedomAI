const winston = require('winston');
const fs = require('fs');
const path = require('path');

// 确保日志目录存在
const logDir = 'logs';
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// 定义日志级别和颜色
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

// 添加颜色
winston.addColors(logColors);

// 定义日志格式
const logFormat = winston.format.printf(
  ({ level, message, timestamp, stack }) => {
    return `${timestamp} [${level}]: ${stack || message}`;
  }
);

// 创建日志记录器
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  levels: logLevels,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    logFormat
  ),
  transports: [
    // 控制台输出
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize({ all: true })
      ),
    }),
    // 记录所有级别的日志到日志文件
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
    }),
    // 记录错误日志到单独的文件
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
    }),
  ],
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logDir, 'exceptions.log'),
    }),
  ],
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logDir, 'rejections.log'),
    }),
  ],
});

module.exports = logger; 