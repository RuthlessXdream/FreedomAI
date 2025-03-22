/**
 * 配置管理脚本
 * 用于查看和修改系统的配置文件
 * 
 * 使用方法:
 * - 查看所有配置: node config_manager.js list
 * - 查看特定配置: node config_manager.js get <配置名>
 * - 修改配置: node config_manager.js set <配置名> <配置值>
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// 项目根目录路径
const rootDir = path.resolve(__dirname, '..');
// .env文件路径
const envPath = path.join(rootDir, '.env');
// .env.example文件路径
const envExamplePath = path.join(rootDir, '.env.example');
// SMTP配置文件路径
const smtpConfigPath = path.join(rootDir, 'config', 'smtp.config.js');

// 命令行参数
const command = process.argv[2];
const configName = process.argv[3];
const configValue = process.argv[4];

// 加载.env配置
function loadEnvConfig() {
  if (!fs.existsSync(envPath)) {
    console.error('错误: .env文件不存在');
    process.exit(1);
  }
  
  const envConfig = dotenv.parse(fs.readFileSync(envPath));
  return envConfig;
}

// 加载SMTP配置
function loadSmtpConfig() {
  if (!fs.existsSync(smtpConfigPath)) {
    console.error('错误: SMTP配置文件不存在');
    return null;
  }
  
  // 注意: 这里简单返回文件路径，实际操作中您需要更复杂的解析方式
  return {
    path: smtpConfigPath,
    content: fs.readFileSync(smtpConfigPath, 'utf8')
  };
}

// 保存.env配置
function saveEnvConfig(config) {
  const content = Object.entries(config)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  
  fs.writeFileSync(envPath, content, 'utf8');
  console.log('配置已更新');
}

// 列出所有配置
function listConfigs() {
  const envConfig = loadEnvConfig();
  const smtpConfig = loadSmtpConfig();
  
  console.log('===== 系统配置文件 =====');
  console.log('1. 环境变量配置 (.env)');
  console.log('   路径:', envPath);
  console.log('   示例:', envExamplePath);
  console.log('\n   主要配置:');
  
  // 显示主要配置分类
  const categories = {
    '服务器配置': ['NODE_ENV', 'PORT', 'HOST'],
    '数据库配置': ['MONGODB_URI', 'MONGODB_TEST_URI'],
    'JWT配置': ['JWT_SECRET', 'JWT_EXPIRES_IN', 'JWT_REFRESH_SECRET', 'JWT_REFRESH_EXPIRES_IN'],
    '安全配置': ['RATE_LIMIT_WINDOW', 'RATE_LIMIT_MAX'],
    '日志配置': ['LOG_LEVEL'],
    '邮件服务配置': ['MAIL_HOST', 'MAIL_PORT', 'MAIL_USER', 'MAIL_PASSWORD', 'MAIL_FROM']
  };
  
  Object.entries(categories).forEach(([category, keys]) => {
    console.log(`\n   [${category}]`);
    keys.forEach(key => {
      console.log(`   ${key}: ${envConfig[key] ? envConfig[key] : '未设置'}`);
    });
  });
  
  console.log('\n2. SMTP邮件配置 (smtp.config.js)');
  console.log('   路径:', smtpConfigPath);
  console.log('   注意: 此文件包含邮件模板，需要手动编辑');
}

// 获取特定配置
function getConfig(name) {
  const envConfig = loadEnvConfig();
  
  if (envConfig[name]) {
    console.log(`${name}: ${envConfig[name]}`);
  } else {
    console.log(`配置 ${name} 未找到或未设置`);
  }
}

// 设置特定配置
function setConfig(name, value) {
  const envConfig = loadEnvConfig();
  
  if (name === 'JWT_SECRET' || name === 'JWT_REFRESH_SECRET') {
    console.log(`警告: 更改 ${name} 将使所有现有令牌失效`);
  }
  
  envConfig[name] = value;
  saveEnvConfig(envConfig);
  console.log(`配置 ${name} 已更新为: ${value}`);
}

// 显示使用帮助
function showHelp() {
  console.log('配置管理脚本');
  console.log('使用方法:');
  console.log('- 查看所有配置: node config_manager.js list');
  console.log('- 查看特定配置: node config_manager.js get <配置名>');
  console.log('- 修改配置: node config_manager.js set <配置名> <配置值>');
  console.log('\n常用配置:');
  console.log('- 端口: PORT');
  console.log('- 数据库连接: MONGODB_URI');
  console.log('- JWT密钥: JWT_SECRET');
  console.log('- 刷新令牌密钥: JWT_REFRESH_SECRET');
  console.log('- 邮件服务器: MAIL_HOST, MAIL_PORT, MAIL_USER, MAIL_PASSWORD');
}

// 主函数
function main() {
  switch(command) {
    case 'list':
      listConfigs();
      break;
    case 'get':
      if (!configName) {
        console.error('错误: 请提供配置名');
        showHelp();
        break;
      }
      getConfig(configName);
      break;
    case 'set':
      if (!configName || !configValue) {
        console.error('错误: 请提供配置名和配置值');
        showHelp();
        break;
      }
      setConfig(configName, configValue);
      break;
    default:
      showHelp();
  }
}

// 执行主函数
main(); 