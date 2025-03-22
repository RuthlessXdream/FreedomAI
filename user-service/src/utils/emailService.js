const nodemailer = require('nodemailer');
const Handlebars = require('handlebars');
const smtpConfig = require('../../config/smtp.config');
const logger = require('./logger');

class EmailService {
  constructor() {
    // 创建Nodemailer传输器
    this.transporter = nodemailer.createTransport(smtpConfig.smtp);
    
    // 添加配置对象，使其可以被外部访问
    this.config = smtpConfig;
    
    // 初始化时验证SMTP配置
    this.verifyConnection();
  }
  
  /**
   * 验证SMTP连接
   */
  async verifyConnection() {
    try {
      await this.transporter.verify();
      logger.info('SMTP服务连接成功，邮件服务已准备就绪');
    } catch (error) {
      logger.error(`SMTP服务连接失败: ${error.message}`);
    }
  }
  
  /**
   * 发送电子邮件
   * @param {string} to 收件人
   * @param {string} subject 邮件主题
   * @param {string} html 邮件内容（HTML格式）
   * @returns {Promise<object>} 发送结果
   */
  async sendEmail(to, subject, html) {
    try {
      logger.debug(`准备发送邮件到 ${to}，主题: "${subject}"`);
      logger.debug(`邮件配置信息: ${JSON.stringify({
        host: smtpConfig.smtp.host,
        port: smtpConfig.smtp.port,
        secure: smtpConfig.smtp.secure,
        auth: { user: smtpConfig.smtp.auth.user }
      })}`);
      
      const info = await this.transporter.sendMail({
        from: `"${smtpConfig.from.name}" <${smtpConfig.from.email}>`,
        to,
        subject,
        html
      });
      
      logger.info(`邮件发送成功: ${info.messageId}`);
      logger.debug(`邮件发送详情: ${JSON.stringify(info)}`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      logger.error(`邮件发送失败: ${error.message}`);
      logger.error(`错误详情: ${JSON.stringify(error, Object.getOwnPropertyNames(error))}`);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * 发送验证邮件
   * @param {string} to 收件人邮箱
   * @param {string} username 用户名
   * @param {string} token 验证令牌
   * @param {string} baseUrl 基础URL
   * @returns {Promise<object>} 发送结果
   */
  async sendVerificationEmail(to, username, token, baseUrl) {
    try {
      const template = Handlebars.compile(smtpConfig.templates.verification.body);
      const verificationUrl = `${baseUrl}/api/auth/verify-email/${token}`;
      
      const html = template({
        username,
        verificationUrl
      });
      
      return await this.sendEmail(
        to,
        smtpConfig.templates.verification.subject,
        html
      );
    } catch (error) {
      logger.error(`发送验证邮件失败: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * 发送密码重置邮件
   * @param {string} to 收件人邮箱
   * @param {string} username 用户名
   * @param {string} token 重置令牌
   * @param {string} baseUrl 基础URL
   * @returns {Promise<object>} 发送结果
   */
  async sendPasswordResetEmail(to, username, token, baseUrl) {
    try {
      const template = Handlebars.compile(smtpConfig.templates.resetPassword.body);
      const resetUrl = `${baseUrl}/reset-password/${token}`;
      
      const html = template({
        username,
        resetUrl
      });
      
      return await this.sendEmail(
        to,
        smtpConfig.templates.resetPassword.subject,
        html
      );
    } catch (error) {
      logger.error(`发送密码重置邮件失败: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new EmailService(); 