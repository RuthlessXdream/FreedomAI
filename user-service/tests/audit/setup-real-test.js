/**
 * 审计日志API测试环境准备脚本
 * 用于准备测试环境，包括创建测试管理员账户和生成测试数据
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const chalk = require('chalk');
const crypto = require('crypto');
const dotenv = require('dotenv');

// 加载环境变量
dotenv.config({ path: path.join(__dirname, '../../.env') });

// 配置
const config = {
  baseUrl: process.env.API_URL || 'http://localhost:3000',
  dbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/freedomdb',
  adminUser: {
    username: 'admin',
    email: 'admin@example.com',
    password: 'admin123',
    role: 'admin',
    isVerified: true
  },
  testUser: {
    username: 'testuser',
    email: 'testuser@example.com',
    password: 'Test@123',
    role: 'user',
    isVerified: true
  },
  testLogsCount: 50, // 生成的测试日志数量
  outputDir: path.join(__dirname, 'output'),
};

// 确保输出目录存在
if (!fs.existsSync(config.outputDir)) {
  fs.mkdirSync(config.outputDir, { recursive: true });
}

// 日志记录
function log(message, type = 'info') {
  const timestamp = new Date().toISOString().substring(11, 19);
  switch (type) {
    case 'success':
      console.log(chalk.green(`[${timestamp}] ✓ ${message}`));
      break;
    case 'error':
      console.log(chalk.red(`[${timestamp}] ✖ ${message}`));
      break;
    case 'warn':
      console.log(chalk.yellow(`[${timestamp}] ⚠ ${message}`));
      break;
    case 'info':
    default:
      console.log(chalk.blue(`[${timestamp}] ℹ ${message}`));
      break;
  }
}

// 连接到数据库
async function connectToDatabase() {
  log('连接到MongoDB...');
  try {
    await mongoose.connect(config.dbUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    log('数据库连接成功', 'success');
    return true;
  } catch (error) {
    log(`数据库连接失败: ${error.message}`, 'error');
    return false;
  }
}

// 加载模型
function loadModels() {
  // 用户模型
  const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    isVerified: { type: Boolean, default: false },
    verificationToken: String,
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  });
  
  // 审计日志模型
  const auditLogSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    action: { type: String, required: true },
    description: { type: String, required: true },
    ipAddress: { type: String },
    userAgent: { type: String },
    timestamp: { type: Date, default: Date.now },
    details: { type: mongoose.Schema.Types.Mixed },
  });
  
  // 注册模型
  try {
    mongoose.model('User', userSchema);
    mongoose.model('AuditLog', auditLogSchema);
    log('模型加载成功', 'success');
    return true;
  } catch (error) {
    log(`模型加载失败: ${error.message}`, 'error');
    return false;
  }
}

// 创建管理员用户
async function createAdminUser() {
  const User = mongoose.model('User');
  
  log(`检查管理员用户是否存在 (${config.adminUser.email})...`);
  
  try {
    // 检查用户是否已存在
    const existingAdmin = await User.findOne({ email: config.adminUser.email });
    
    if (existingAdmin) {
      log(`管理员用户已存在 (ID: ${existingAdmin._id})`, 'warn');
      return existingAdmin;
    }
    
    // 创建新管理员
    log('创建新管理员用户...');
    
    // 哈希密码
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(config.adminUser.password, salt);
    
    const newAdmin = new User({
      username: config.adminUser.username,
      email: config.adminUser.email,
      password: hashedPassword,
      role: config.adminUser.role,
      isVerified: config.adminUser.isVerified,
    });
    
    const savedAdmin = await newAdmin.save();
    log(`管理员用户创建成功 (ID: ${savedAdmin._id})`, 'success');
    return savedAdmin;
  } catch (error) {
    log(`管理员用户创建失败: ${error.message}`, 'error');
    throw error;
  }
}

// 创建测试用户
async function createTestUser() {
  const User = mongoose.model('User');
  
  log(`检查测试用户是否存在 (${config.testUser.email})...`);
  
  try {
    // 检查用户是否已存在
    const existingUser = await User.findOne({ email: config.testUser.email });
    
    if (existingUser) {
      log(`测试用户已存在 (ID: ${existingUser._id})`, 'warn');
      return existingUser;
    }
    
    // 创建新测试用户
    log('创建新测试用户...');
    
    // 哈希密码
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(config.testUser.password, salt);
    
    const newUser = new User({
      username: config.testUser.username,
      email: config.testUser.email,
      password: hashedPassword,
      role: config.testUser.role,
      isVerified: config.testUser.isVerified,
    });
    
    const savedUser = await newUser.save();
    log(`测试用户创建成功 (ID: ${savedUser._id})`, 'success');
    return savedUser;
  } catch (error) {
    log(`测试用户创建失败: ${error.message}`, 'error');
    throw error;
  }
}

// 生成随机IP地址
function generateRandomIp() {
  return `${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;
}

// 生成随机用户代理字符串
function generateRandomUserAgent() {
  const browsers = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
  ];
  
  return browsers[Math.floor(Math.random() * browsers.length)];
}

// 生成测试审计日志
async function generateTestAuditLogs(adminUser, testUser) {
  const AuditLog = mongoose.model('AuditLog');
  
  log(`生成 ${config.testLogsCount} 条测试审计日志...`);
  
  // 可能的操作类型
  const actions = [
    'USER_LOGIN',
    'USER_LOGOUT',
    'USER_REGISTER',
    'USER_UPDATE',
    'USER_PASSWORD_RESET',
    'USER_ROLE_CHANGE',
    'ADMIN_LOGIN',
    'ADMIN_LOGOUT',
    'ADMIN_USER_VIEW',
    'ADMIN_USER_CREATE',
    'ADMIN_USER_EDIT',
    'ADMIN_USER_DELETE',
    'SYSTEM_STARTUP',
    'SYSTEM_SHUTDOWN',
    'API_ACCESS',
  ];
  
  // 生成日志
  const logs = [];
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  const users = [adminUser, testUser];
  
  for (let i = 0; i < config.testLogsCount; i++) {
    // 随机选择用户
    const user = users[Math.floor(Math.random() * users.length)];
    // 随机选择操作
    const action = actions[Math.floor(Math.random() * actions.length)];
    // 随机时间（过去30天内）
    const timestamp = new Date(now - Math.floor(Math.random() * 30 * oneDay));
    
    // 根据操作生成描述和详情
    let description = '';
    let details = {};
    
    switch (action) {
      case 'USER_LOGIN':
        description = '用户登录';
        details = { success: true, method: 'password' };
        break;
      case 'USER_LOGOUT':
        description = '用户登出';
        details = { reason: 'user_initiated' };
        break;
      case 'USER_REGISTER':
        description = '新用户注册';
        details = { method: 'email' };
        break;
      case 'USER_UPDATE':
        description = '用户更新个人信息';
        details = { fields: ['username', 'email', 'profile'] };
        break;
      case 'USER_PASSWORD_RESET':
        description = '用户重置密码';
        details = { method: 'email' };
        break;
      case 'USER_ROLE_CHANGE':
        description = '用户角色变更';
        details = { oldRole: 'user', newRole: 'admin' };
        break;
      case 'ADMIN_LOGIN':
        description = '管理员登录';
        details = { success: true };
        break;
      case 'ADMIN_LOGOUT':
        description = '管理员登出';
        details = { reason: 'user_initiated' };
        break;
      case 'ADMIN_USER_VIEW':
        description = '管理员查看用户信息';
        details = { targetUserId: testUser._id };
        break;
      case 'ADMIN_USER_CREATE':
        description = '管理员创建新用户';
        details = { newUserId: crypto.randomBytes(12).toString('hex') };
        break;
      case 'ADMIN_USER_EDIT':
        description = '管理员编辑用户信息';
        details = { targetUserId: testUser._id, fields: ['role', 'status'] };
        break;
      case 'ADMIN_USER_DELETE':
        description = '管理员删除用户';
        details = { targetUserId: crypto.randomBytes(12).toString('hex') };
        break;
      case 'SYSTEM_STARTUP':
        description = '系统启动';
        details = { version: '1.0.0' };
        break;
      case 'SYSTEM_SHUTDOWN':
        description = '系统关闭';
        details = { reason: 'maintenance' };
        break;
      case 'API_ACCESS':
        description = '访问API';
        details = { endpoint: '/api/users', method: 'GET' };
        break;
    }
    
    // 创建日志
    const log = new AuditLog({
      userId: user._id,
      action,
      description,
      ipAddress: generateRandomIp(),
      userAgent: generateRandomUserAgent(),
      timestamp,
      details,
    });
    
    logs.push(log);
  }
  
  try {
    await AuditLog.insertMany(logs);
    log(`${logs.length} 条测试审计日志生成成功`, 'success');
    return logs.length;
  } catch (error) {
    log(`测试审计日志生成失败: ${error.message}`, 'error');
    throw error;
  }
}

// 主函数
async function setupTestEnvironment() {
  try {
    log('开始准备审计日志API测试环境', 'info');
    log(`数据库URI: ${config.dbUri}`);
    log(`管理员邮箱: ${config.adminUser.email}`);
    log(`测试用户邮箱: ${config.testUser.email}`);
    
    // 连接数据库
    const dbConnected = await connectToDatabase();
    if (!dbConnected) {
      log('因数据库连接失败，无法继续设置测试环境', 'error');
      process.exit(1);
    }
    
    // 加载模型
    const modelsLoaded = loadModels();
    if (!modelsLoaded) {
      log('因模型加载失败，无法继续设置测试环境', 'error');
      process.exit(1);
    }
    
    // 创建管理员用户
    const adminUser = await createAdminUser();
    
    // 创建测试用户
    const testUser = await createTestUser();
    
    // 生成测试审计日志
    await generateTestAuditLogs(adminUser, testUser);
    
    // 保存测试账户信息到文件，以便测试脚本使用
    const testAccounts = {
      admin: {
        email: config.adminUser.email,
        password: config.adminUser.password,
        id: adminUser._id.toString(),
      },
      user: {
        email: config.testUser.email,
        password: config.testUser.password,
        id: testUser._id.toString(),
      },
    };
    
    fs.writeFileSync(
      path.join(config.outputDir, 'test_accounts.json'),
      JSON.stringify(testAccounts, null, 2)
    );
    log('测试账户信息已保存到文件', 'success');
    
    log('测试环境准备完成!', 'success');
    log('您可以使用以下命令运行测试:');
    log('node tests/audit/real-test.js');
    
    // 关闭数据库连接
    await mongoose.connection.close();
    log('数据库连接已关闭', 'success');
    
  } catch (error) {
    log(`测试环境准备过程中出现错误: ${error.message}`, 'error');
    console.error(error);
    
    // 尝试关闭数据库连接
    try {
      await mongoose.connection.close();
    } catch (e) {
      // 忽略关闭错误
    }
    
    process.exit(1);
  }
}

// 运行环境准备
setupTestEnvironment(); 