/**
 * 真实环境测试准备脚本
 * 
 * 此脚本执行以下操作:
 * 1. 清空现有用户数据
 * 2. 初始化数据库，创建管理员和测试用户
 * 3. 生成测试审计日志
 * 4. 验证环境准备就绪
 */

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const axios = require('axios');

// 加载环境变量
dotenv.config({ path: path.join(__dirname, '../../.env') });

// 配置
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/user-service';
const API_URL = process.env.API_URL || 'http://localhost:3002/api';
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'Admin@123';
const TEST_USER_EMAIL = 'testuser@example.com';
const TEST_USER_PASSWORD = 'Test@123';

// 设置用户模型
const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String,
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  isVerified: { type: Boolean, default: false },
  verificationToken: String,
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  mfaEnabled: { type: Boolean, default: false },
  mfaSecret: String,
  isSuspicious: { type: Boolean, default: false },
  suspiciousLoginAttempts: [{ 
    timestamp: Date,
    ipAddress: String,
    userAgent: String,
    location: String,
    status: { type: String, enum: ['flagged', 'approved', 'rejected'], default: 'flagged' }
  }],
  lastLogin: Date,
  devices: [{
    deviceId: String,
    deviceName: String,
    browser: String,
    os: String,
    lastActive: Date,
    ipAddress: String,
    isTrusted: { type: Boolean, default: false }
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const auditLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  action: String,
  details: mongoose.Schema.Types.Mixed,
  ipAddress: String,
  userAgent: String,
  timestamp: { type: Date, default: Date.now }
});

// 彩色日志输出
const log = {
  info: (msg) => console.log('\x1b[36m%s\x1b[0m', `[INFO] ${msg}`),
  success: (msg) => console.log('\x1b[32m%s\x1b[0m', `[SUCCESS] ${msg}`),
  error: (msg) => console.log('\x1b[31m%s\x1b[0m', `[ERROR] ${msg}`),
  warning: (msg) => console.log('\x1b[33m%s\x1b[0m', `[WARN] ${msg}`),
  data: (msg) => console.log('\x1b[90m%s\x1b[0m', msg)
};

// 连接数据库
async function connectToDatabase() {
  log.info(`正在连接到MongoDB数据库: ${MONGODB_URI}`);
  
  try {
    await mongoose.connect(MONGODB_URI);
    log.success('数据库连接成功');
    return true;
  } catch (error) {
    log.error(`数据库连接失败: ${error.message}`);
    return false;
  }
}

// 清空所有用户数据
async function clearAllUsers() {
  log.info('正在清空所有用户数据...');
  
  const User = mongoose.model('User', userSchema);
  
  try {
    const result = await User.deleteMany({});
    log.success(`已删除 ${result.deletedCount} 个用户`);
    return true;
  } catch (error) {
    log.error(`删除用户失败: ${error.message}`);
    return false;
  }
}

// 清空所有审计日志
async function clearAllAuditLogs() {
  log.info('正在清空所有审计日志...');
  
  const AuditLog = mongoose.model('AuditLog', auditLogSchema);
  
  try {
    const result = await AuditLog.deleteMany({});
    log.success(`已删除 ${result.deletedCount} 条审计日志`);
    return true;
  } catch (error) {
    log.error(`删除审计日志失败: ${error.message}`);
    return false;
  }
}

// 创建管理员用户
async function createAdminUser() {
  log.info(`正在创建管理员用户 (${ADMIN_EMAIL})...`);
  
  const User = mongoose.model('User', userSchema);
  
  try {
    // 检查是否已存在
    const existingAdmin = await User.findOne({ email: ADMIN_EMAIL });
    if (existingAdmin) {
      log.warning('管理员用户已存在，跳过创建');
      return existingAdmin;
    }
    
    // 创建新管理员
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
    
    const admin = new User({
      username: 'admin',
      email: ADMIN_EMAIL,
      password: hashedPassword,
      role: 'admin',
      isVerified: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    await admin.save();
    log.success('管理员用户创建成功');
    
    return admin;
  } catch (error) {
    log.error(`创建管理员用户失败: ${error.message}`);
    return null;
  }
}

// 创建测试用户
async function createTestUser() {
  log.info(`正在创建测试用户 (${TEST_USER_EMAIL})...`);
  
  const User = mongoose.model('User', userSchema);
  
  try {
    // 检查是否已存在
    const existingUser = await User.findOne({ email: TEST_USER_EMAIL });
    if (existingUser) {
      log.warning('测试用户已存在，跳过创建');
      return existingUser;
    }
    
    // 创建新测试用户
    const hashedPassword = await bcrypt.hash(TEST_USER_PASSWORD, 10);
    
    const testUser = new User({
      username: 'testuser',
      email: TEST_USER_EMAIL,
      password: hashedPassword,
      role: 'user',
      isVerified: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    await testUser.save();
    log.success('测试用户创建成功');
    
    return testUser;
  } catch (error) {
    log.error(`创建测试用户失败: ${error.message}`);
    return null;
  }
}

// 生成测试审计日志
async function generateTestAuditLogs(admin, testUser) {
  log.info('正在生成测试审计日志...');
  
  const AuditLog = mongoose.model('AuditLog', auditLogSchema);
  
  try {
    // 管理员登录日志
    const adminLoginLog = new AuditLog({
      userId: admin._id,
      action: 'USER_LOGIN',
      details: { 
        success: true,
        method: 'password'
      },
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      timestamp: new Date()
    });
    
    // 管理员创建用户日志
    const adminCreateUserLog = new AuditLog({
      userId: admin._id,
      action: 'USER_CREATE',
      details: { 
        targetUserId: testUser._id,
        targetEmail: testUser.email
      },
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      timestamp: new Date(Date.now() - 1000 * 60 * 5) // 5分钟前
    });
    
    // 测试用户登录日志
    const testUserLoginLog = new AuditLog({
      userId: testUser._id,
      action: 'USER_LOGIN',
      details: { 
        success: true,
        method: 'password'
      },
      ipAddress: '192.168.1.2',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      timestamp: new Date(Date.now() - 1000 * 60 * 3) // 3分钟前
    });
    
    // 测试用户更新个人资料日志
    const testUserUpdateLog = new AuditLog({
      userId: testUser._id,
      action: 'USER_UPDATE',
      details: { 
        fields: ['username', 'email']
      },
      ipAddress: '192.168.1.2',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      timestamp: new Date(Date.now() - 1000 * 60 * 2) // 2分钟前
    });
    
    // 保存所有日志
    await Promise.all([
      adminLoginLog.save(),
      adminCreateUserLog.save(),
      testUserLoginLog.save(),
      testUserUpdateLog.save()
    ]);
    
    log.success('测试审计日志生成成功');
    return true;
  } catch (error) {
    log.error(`生成测试审计日志失败: ${error.message}`);
    return false;
  }
}

// 验证管理员登录
async function verifyAdminLogin() {
  log.info(`正在验证管理员登录 (${ADMIN_EMAIL})...`);
  
  try {
    const response = await axios.post(`${API_URL}/auth/login`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    });
    
    if (response.data && response.data.success) {
      log.success('管理员登录成功');
      return response.data.token;
    } else {
      log.error(`管理员登录失败: ${response.data.message}`);
      return null;
    }
  } catch (error) {
    log.error(`管理员登录请求失败: ${error.response?.data?.message || error.message}`);
    return null;
  }
}

// 验证测试用户登录
async function verifyTestUserLogin() {
  log.info(`正在验证测试用户登录 (${TEST_USER_EMAIL})...`);
  
  try {
    const response = await axios.post(`${API_URL}/auth/login`, {
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD
    });
    
    if (response.data && response.data.success) {
      log.success('测试用户登录成功');
      return response.data.token;
    } else {
      log.error(`测试用户登录失败: ${response.data.message}`);
      return null;
    }
  } catch (error) {
    log.error(`测试用户登录请求失败: ${error.response?.data?.message || error.message}`);
    return null;
  }
}

// 主函数
async function setupRealTestEnvironment() {
  log.info('=== 开始准备真实环境测试 ===');
  
  // 连接数据库
  const dbConnected = await connectToDatabase();
  if (!dbConnected) {
    log.error('由于数据库连接失败，环境准备中止');
    return false;
  }
  
  // 清空现有数据
  await clearAllUsers();
  await clearAllAuditLogs();
  
  // 创建用户
  const admin = await createAdminUser();
  const testUser = await createTestUser();
  
  if (!admin || !testUser) {
    log.error('由于用户创建失败，环境准备中止');
    return false;
  }
  
  // 生成测试审计日志
  await generateTestAuditLogs(admin, testUser);
  
  // 验证环境
  log.info('');
  log.info('验证测试环境...');
  
  const adminToken = await verifyAdminLogin();
  const testUserToken = await verifyTestUserLogin();
  
  log.info('');
  log.info('=== 真实环境测试准备完成 ===');
  log.info('');
  log.info('测试环境信息:');
  log.info(`管理员用户: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  log.info(`测试用户: ${TEST_USER_EMAIL} / ${TEST_USER_PASSWORD}`);
  log.info(`API基础URL: ${API_URL}`);
  log.info('');
  log.info('现在可以运行 test-audit-log-api.js 进行真实环境测试');
  
  return true;
}

// 运行初始化
setupRealTestEnvironment()
  .then(success => {
    if (success) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  })
  .catch(error => {
    log.error(`初始化过程中发生未处理的错误: ${error.message}`);
    console.error(error);
    process.exit(1);
  }); 