/**
 * FREEDOM AI 邮件测试工具
 * 用于测试不同类型的邮件模板
 */
const emailService = require('../../src/utils/emailService');
const logger = require('../../src/utils/logger');
const smtpConfig = require('../../config/smtp.config');
const Handlebars = require('handlebars');
const path = require('path');
const fs = require('fs');

// 默认配置
const DEFAULT_CONFIG = {
  // 收件人邮箱
  recipientEmail: 'wyk9@outlook.com',
  // 应用名称
  appName: 'FREEDOM AI 用户认证系统',
  // 基础URL
  baseUrl: 'https://user.freedomai.cn',
  // MFA验证码
  mfaCode: '123456',
  // MFA过期时间(分钟)
  expireMinutes: 5,
  // 验证码
  verificationCode: '789012',
  // 重置码
  resetCode: '456789'
};

// 图片路径
const LOGO_PATH = path.join(__dirname, 'logo.png');
const LOGO_SMALL_PATH = path.join(__dirname, 'logo.png'); // 使用同一个logo作为小图标
const WARNING_ICON_PATH = path.join(__dirname, 'warning-icon.png'); // 如果有此图标

/**
 * 读取图片文件为base64
 * @param {string} filePath 图片文件路径
 * @returns {string|null} base64编码的图片，如果文件不存在则返回null
 */
function getImageAsBase64(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      const bitmap = fs.readFileSync(filePath);
      return bitmap.toString('base64');
    }
    logger.warn(`图片文件不存在: ${filePath}`);
    return null;
  } catch (error) {
    logger.error(`读取图片文件失败: ${error.message}`);
    return null;
  }
}

/**
 * 创建邮件附件
 * @returns {Array} 附件数组
 */
function createAttachments() {
  const attachments = [];
  
  // Logo图片
  const logoBase64 = getImageAsBase64(LOGO_PATH);
  if (logoBase64) {
    attachments.push({
      filename: 'logo.png',
      content: logoBase64,
      encoding: 'base64',
      cid: 'logo' // 在HTML中通过 cid:logo 引用
    });
    
    // 小图标（使用同一个logo）
    attachments.push({
      filename: 'logo-small.png',
      content: logoBase64,
      encoding: 'base64',
      cid: 'logo-small' // 在HTML中通过 cid:logo-small 引用
    });
  }
  
  // 警告图标
  const warningIconBase64 = getImageAsBase64(WARNING_ICON_PATH);
  if (warningIconBase64) {
    attachments.push({
      filename: 'warning-icon.png',
      content: warningIconBase64,
      encoding: 'base64',
      cid: 'warning-icon' // 在HTML中通过 cid:warning-icon 引用
    });
  } else {
    // 如果警告图标文件不存在，创建一个简单的警告符号作为备用
    attachments.push({
      filename: 'warning-icon.png',
      content: `
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#ff8a65">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
        </svg>
      `,
      contentType: 'image/svg+xml',
      cid: 'warning-icon'
    });
  }
  
  return attachments;
}

/**
 * 发送测试邮件
 * @param {string} type 邮件类型: verification, resetPassword, mfa
 * @param {object} customConfig 自定义配置
 */
async function sendTestEmail(type = 'verification', customConfig = {}) {
  // 合并配置
  const config = { ...DEFAULT_CONFIG, ...customConfig };
  logger.info(`开始发送 ${type} 测试邮件到: ${config.recipientEmail}`);
  
  try {
    // 创建附件
    const attachments = createAttachments();
    
    let subject = '';
    let html = '';
    
    switch (type) {
      case 'verification':
        // 注册验证邮件
        const verificationTemplate = Handlebars.compile(smtpConfig.templates.verification.body);
        html = verificationTemplate({
          email: config.recipientEmail, // 使用邮箱作为显示名
          verificationCode: config.verificationCode,
          appName: config.appName
        });
        subject = smtpConfig.templates.verification.subject;
        break;
        
      case 'resetPassword':
        // 密码重置邮件
        const resetTemplate = Handlebars.compile(smtpConfig.templates.resetPassword.body);
        html = resetTemplate({
          email: config.recipientEmail, // 使用邮箱作为显示名
          resetCode: config.resetCode,
          appName: config.appName
        });
        subject = smtpConfig.templates.resetPassword.subject;
        break;
        
      case 'mfa':
        // MFA验证邮件
        const mfaTemplate = Handlebars.compile(smtpConfig.templates.mfaVerification.body);
        html = mfaTemplate({
          email: config.recipientEmail, // 使用邮箱作为显示名
          mfaCode: config.mfaCode,
          expireMinutes: config.expireMinutes,
          appName: config.appName
        });
        subject = smtpConfig.templates.mfaVerification.subject;
        break;
        
      default:
        throw new Error(`未知的邮件类型: ${type}`);
    }
    
    // 发送带附件的邮件
    const mailOptions = {
      from: `"${smtpConfig.from.name}" <${smtpConfig.from.email}>`,
      to: config.recipientEmail,
      subject: subject,
      html: html,
      attachments: attachments
    };
    
    // 使用邮件服务的transporter直接发送
    const info = await emailService.transporter.sendMail(mailOptions);
    
    logger.info(`${type} 邮件发送成功! MessageID: ${info.messageId}`);
    logger.debug(`邮件发送详情: ${JSON.stringify(info)}`);
    
    return { success: true, messageId: info.messageId };
  } catch (error) {
    logger.error(`发送邮件时发生错误: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// 处理命令行参数
const args = process.argv.slice(2);
const type = args[0] || 'verification';
const email = args[1] || DEFAULT_CONFIG.recipientEmail;

// 执行发送操作
sendTestEmail(type, { recipientEmail: email })
  .then(result => {
    if (result.success) {
      logger.info('测试邮件发送完成');
    } else {
      logger.error('测试邮件发送失败');
      process.exit(1);
    }
  })
  .catch(err => {
    logger.error(`脚本执行失败: ${err.message}`);
    process.exit(1);
  });

/**
 * 使用说明:
 * 
 * 1. 发送验证邮件: 
 *    node testEmails.js verification "example@email.com"
 * 
 * 2. 发送密码重置邮件:
 *    node testEmails.js resetPassword "example@email.com"
 * 
 * 3. 发送MFA验证邮件:
 *    node testEmails.js mfa "example@email.com"
 * 
 * 如果不提供邮箱参数，将使用默认配置发送到 wyk9@outlook.com
 */ 