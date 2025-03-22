/**
 * 发送测试邮件的脚本
 */
const emailService = require('../../src/utils/emailService');
const logger = require('../../src/utils/logger');

// 收件人邮箱
const recipientEmail = 'wyk9@outlook.com';

async function sendTestEmail() {
  logger.info(`开始发送测试邮件到: ${recipientEmail}`);
  
  try {
    // 准备邮件内容
    const subject = '测试邮件 - FreedomAI用户服务';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
        <h2 style="color: #333;">测试邮件</h2>
        <p>这是一封来自FreedomAI用户服务的测试邮件。</p>
        <p>如果您收到这封邮件，表示我们的邮件系统工作正常。</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="color: #999; font-size: 12px;">此邮件由系统自动发送，请勿回复。</p>
      </div>
    `;
    
    // 发送邮件
    const result = await emailService.sendEmail(recipientEmail, subject, html);
    
    if (result.success) {
      logger.info(`邮件发送成功! MessageID: ${result.messageId}`);
    } else {
      logger.error(`邮件发送失败: ${result.error}`);
    }
  } catch (error) {
    logger.error(`发送邮件时发生错误: ${error.message}`);
  }
}

// 执行发送操作
sendTestEmail().catch(err => {
  logger.error(`脚本执行失败: ${err.message}`);
  process.exit(1);
}); 