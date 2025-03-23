const User = require('../models/User');
const { validationResult } = require('express-validator');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const emailService = require('../utils/emailService');
const logger = require('../utils/logger');
const path = require('path');
const handlebars = require('handlebars');

// 辅助函数：创建并发送令牌
const createSendToken = async (user, statusCode, res) => {
  try {
    // 生成访问令牌
    const token = user.generateAuthToken();
    
    // 生成刷新令牌（异步操作）
    const refreshToken = await user.generateRefreshToken();
    
    // 更新最后登录时间
    user.lastLogin = Date.now();
    await user.save({ validateBeforeSave: false });
    
    logger.debug(`用户 ${user._id} 的令牌已更新: lastLogin=${user.lastLogin}, refreshToken=${refreshToken.substring(0, 10)}...`);
    
    // 从响应中移除敏感字段
    const userResponse = user.toObject(); // 转换为普通对象以便修改
    delete userResponse.password;
    delete userResponse.refreshToken;
    
    res.status(statusCode).json({
      success: true,
      token,
      refreshToken,
      user: userResponse
    });
  } catch (error) {
    logger.error(`创建令牌错误: ${error.message}`);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 生成随机验证码
const generateCode = (length = 6) => {
  return Math.floor(Math.random() * (10 ** length - 10 ** (length - 1)) + 10 ** (length - 1)).toString();
};

// @desc    注册用户
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    // 检查验证错误
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { username, email, password, verificationCode: customVerificationCode } = req.body;
    
    // 检查用户是否已存在
    let user = await User.findOne({ 
      $or: [{ email }, { username }] 
    });
    
    if (user) {
      return res.status(400).json({
        success: false,
        message: '用户名或邮箱已被注册'
      });
    }
    
    // 创建验证令牌
    const verificationToken = crypto.randomBytes(20).toString('hex');
    const verificationExpire = Date.now() + 24 * 60 * 60 * 1000; // 24小时有效期
    
    // 使用自定义验证码或生成新的验证码
    const verificationCode = customVerificationCode || generateCode(6);
    
    // 创建新用户
    user = new User({
      username,
      email,
      password,
      verificationToken,
      verificationCode,
      verificationExpire
    });
    
    await user.save();
    
    // 发送验证邮件
    const appName = process.env.APP_NAME || 'FREEDOM AI 用户认证系统';
    try {
      const result = await emailService.transporter.sendMail({
        from: `"${emailService.config.from.name}" <${emailService.config.from.email}>`,
        to: email,
        subject: emailService.config.templates.verification.subject,
        html: handlebars.compile(emailService.config.templates.verification.body)({
          email: email,
          verificationCode: verificationCode,
          appName: appName
        })
      });
      
      logger.info(`验证邮件已发送至 ${email}, MessageID: ${result.messageId}`);
    } catch (emailError) {
      logger.error(`发送验证邮件失败: ${emailError.message}`);
      // 邮件发送失败不阻止注册流程
    }
    
    // 在响应中包含验证码（仅在测试环境中）
    const responseData = {
      success: true,
      message: '用户注册成功，请查收验证邮件',
      userId: user._id
    };
    
    if (process.env.NODE_ENV === 'development') {
      responseData.verificationCode = verificationCode;
    }
    
    res.status(201).json(responseData);
  } catch (error) {
    logger.error(`注册错误: ${error.message}`);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    登录用户
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password, mfaCode: customMfaCode } = req.body;
    
    // 检查验证错误
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }
    
    // 获取用户IP和用户代理信息
    const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.ip;
    const userAgent = req.headers['user-agent'] || 'Unknown';
    
    // 查找用户
    const user = await User.findOne({ email }).select('+password');
    
    // 用户不存在或密码不匹配
    if (!user || !(await user.comparePassword(password))) {
      // 记录失败的登录尝试
      if (user) {
        await user.incLoginAttempts();
        
        // 记录登录失败审计日志
        const auditLogService = require('../services/auditLogService');
        auditLogService.createLog({
          userId: user._id,
          username: user.username,
          action: 'LOGIN_FAILED',
          ipAddress,
          userAgent,
          details: {
            reason: '密码不正确',
            email
          }
        });
      }
      
      return res.status(401).json({
        success: false,
        message: '邮箱或密码不正确'
      });
    }
    
    // 检查账户是否被锁定
    if (user.isLocked) {
      if (user.lockUntil && user.lockUntil > Date.now()) {
        return res.status(401).json({
          success: false,
          message: `账户已被锁定，请在${Math.ceil((user.lockUntil - Date.now()) / 1000 / 60)}分钟后重试`
        });
      } else {
        // 锁定时间已过，重置锁定状态
        user.isLocked = false;
        user.loginAttempts = 0;
        user.lockUntil = undefined;
        await user.save({ validateBeforeSave: false });
      }
    }
    
    // 检查账户是否已验证
    if (!user.isVerified) {
      return res.status(401).json({
        success: false,
        message: '此账户尚未验证邮箱，请先验证邮箱'
      });
    }
    
    // 检查是否启用了双因素认证
    if (user.isTwoFactorEnabled) {
      // 如果没有提供MFA代码，返回需要MFA的状态
      if (!customMfaCode) {
        // 生成新的MFA验证码
        const mfaCode = generateCode(6);
        user.mfaCode = mfaCode;
        user.mfaExpire = Date.now() + 10 * 60 * 1000; // 10分钟有效期
        await user.save({ validateBeforeSave: false });
        
        // 发送MFA验证码邮件
        try {
          const result = await emailService.transporter.sendMail({
            from: `"${emailService.config.from.name}" <${emailService.config.from.email}>`,
            to: user.email,
            subject: '安全登录验证码',
            html: `<p>您的安全登录验证码是: <strong>${mfaCode}</strong>，10分钟内有效。</p>
                  <p>如果这不是您的操作，请立即修改密码。</p>`
          });
          
          logger.info(`MFA验证码已发送至 ${user.email}, MessageID: ${result.messageId}`);
        } catch (emailError) {
          logger.error(`发送MFA验证码邮件失败: ${emailError.message}`);
        }
        
        // 在开发环境中返回MFA代码（方便测试）
        const response = {
          success: true,
          requireMFA: true,
          message: '需要双因素认证，请输入验证码'
        };
        
        if (process.env.NODE_ENV === 'development') {
          response.mfaCode = mfaCode;
        }
        
        return res.status(200).json(response);
      }
      
      // 验证MFA代码
      if (!user.mfaCode || !user.mfaExpire || user.mfaExpire < Date.now()) {
        return res.status(400).json({
          success: false,
          message: 'MFA验证码已过期，请重新请求'
        });
      }
      
      if (user.mfaCode !== customMfaCode) {
        return res.status(400).json({
          success: false,
          message: 'MFA验证码不正确'
        });
      }
      
      // MFA验证通过，清除MFA数据
      user.mfaCode = undefined;
      user.mfaExpire = undefined;
    }
    
    // 重置登录尝试次数
    user.loginAttempts = 0;
    user.isLocked = false;
    user.lockUntil = undefined;
    
    // 记录设备信息
    const deviceService = require('../services/deviceService');
    const device = await deviceService.recordDeviceLogin(user._id, userAgent, ipAddress);
    
    // 检查是否是可疑登录
    const suspiciousCheck = await deviceService.checkSuspiciousLogin(user._id, ipAddress, userAgent);
    
    // 如果是可疑登录，发送安全通知邮件
    if (suspiciousCheck.isSuspicious) {
      try {
        // 获取设备信息
        const parser = new (require('ua-parser-js'))(userAgent);
        const deviceInfo = parser.getResult();
        
        // 准备邮件内容
        const browser = deviceInfo.browser.name ? `${deviceInfo.browser.name} ${deviceInfo.browser.version}` : '未知浏览器';
        const os = deviceInfo.os.name ? `${deviceInfo.os.name} ${deviceInfo.os.version}` : '未知操作系统';
        const suspiciousReasons = [];
        
        if (suspiciousCheck.isNewDevice) suspiciousReasons.push('新设备登录');
        if (suspiciousCheck.isUnusualIP) suspiciousReasons.push('不常用IP地址');
        if (suspiciousCheck.isUnusualBrowser) suspiciousReasons.push('不常用浏览器');
        
        const reasonText = suspiciousReasons.join('、');
        
        // 发送安全警告邮件
        const result = await emailService.transporter.sendMail({
          from: `"${emailService.config.from.name} 安全中心" <${emailService.config.from.email}>`,
          to: user.email,
          subject: '【安全警告】检测到可疑的账户登录',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
              <h2 style="color: #d9534f;">【安全警告】检测到可疑的账户登录</h2>
              <p>我们检测到一次来自新设备或不常用位置的登录活动。如果这是您本人操作，请忽略此邮件。</p>
              
              <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0;">
                <h3 style="margin-top: 0;">登录详情：</h3>
                <p><strong>时间：</strong> ${new Date().toLocaleString('zh-CN')}</p>
                <p><strong>IP地址：</strong> ${ipAddress}</p>
                <p><strong>浏览器：</strong> ${browser}</p>
                <p><strong>操作系统：</strong> ${os}</p>
                <p><strong>可疑原因：</strong> ${reasonText}</p>
              </div>
              
              <p>如果这不是您的操作，您的账户可能已被盗用。请立即采取以下措施：</p>
              <ol>
                <li>立即修改密码</li>
                <li>启用双因素认证</li>
                <li>检查并移除不信任的登录设备</li>
                <li>联系我们的客服团队</li>
              </ol>
              
              <p style="padding-top: 15px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #777;">
                此邮件由系统自动发送，请勿回复。如有疑问，请联系客服。
              </p>
            </div>
          `
        });
        
        logger.info(`可疑登录安全通知已发送至 ${user.email}, MessageID: ${result.messageId}`);
      } catch (emailError) {
        logger.error(`发送可疑登录通知邮件失败: ${emailError.message}`);
        // 邮件发送失败不影响登录流程
      }
    }
    
    // 创建并发送令牌
    await createSendToken(user, 200, res);
    
    // 记录登录成功审计日志
    const auditLogService = require('../services/auditLogService');
    auditLogService.createLog({
      userId: user._id,
      username: user.username,
      action: 'LOGIN_SUCCESS',
      ipAddress,
      userAgent,
      details: {
        device: {
          id: device._id,
          deviceType: device.deviceType,
          browser: device.browser
        },
        suspicious: suspiciousCheck
      }
    });
    
    // 如果是可疑登录，在响应中添加警告
    if (suspiciousCheck.isSuspicious) {
      res.append('X-Login-Suspicious', 'true');
      res.append('X-Suspicious-Score', suspiciousCheck.suspicionScore);
    }
  } catch (error) {
    logger.error(`登录错误: ${error.message}`);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    验证MFA
// @route   POST /api/auth/verify-mfa
// @access  Public
exports.verifyMFA = async (req, res) => {
  try {
    const { userId, mfaCode } = req.body;
    
    if (!userId || !mfaCode) {
      return res.status(400).json({
        success: false,
        message: '用户ID和验证码都是必需的'
      });
    }
    
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    if (!user.mfaCode || !user.mfaExpire || user.mfaExpire < Date.now()) {
      return res.status(400).json({
        success: false,
        message: '验证码已过期，请重新登录'
      });
    }
    
    if (user.mfaCode !== mfaCode) {
      return res.status(400).json({
        success: false,
        message: '验证码错误'
      });
    }
    
    // 清除MFA验证码
    user.mfaCode = undefined;
    user.mfaExpire = undefined;
    await user.save({ validateBeforeSave: false });
    
    // 创建并发送令牌
    await createSendToken(user, 200, res);
  } catch (error) {
    logger.error(`MFA验证错误: ${error.message}`);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    刷新访问令牌
// @route   POST /api/auth/refresh-token
// @access  Public
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      logger.warn('缺少刷新令牌');
      return res.status(400).json({
        success: false,
        message: '刷新令牌是必需的'
      });
    }
    
    logger.debug(`尝试刷新令牌: ${refreshToken.substring(0, 15)}...`);
    
    // 验证刷新令牌
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      logger.debug(`刷新令牌验证成功，用户ID: ${decoded.id}`);
    } catch (error) {
      logger.warn(`令牌验证失败: ${error.message}`);
      return res.status(401).json({
        success: false,
        message: '无效或过期的刷新令牌'
      });
    }
    
    // 查找用户并检查刷新令牌是否匹配
    // 使用 .select('+refreshToken') 明确选择 refreshToken 字段
    const user = await User.findById(decoded.id);
    
    if (!user) {
      logger.warn(`找不到用户: ${decoded.id}`);
      return res.status(401).json({
        success: false,
        message: '无效的刷新令牌'
      });
    }
    
    logger.debug(`找到用户: ${user.email}, 刷新令牌: ${user.refreshToken ? '存在' : '不存在'}`);
    
    // 直接检查数据库中的refreshToken
    if (!user.refreshToken) {
      logger.warn(`用户没有刷新令牌: ${user.email}`);
      return res.status(401).json({
        success: false,
        message: '无效的刷新令牌'
      });
    }
    
    if (user.refreshToken !== refreshToken) {
      logger.warn(`刷新令牌不匹配: ${user.email}`);
      logger.debug(`数据库令牌: ${user.refreshToken.substring(0, 10)}..., 请求令牌: ${refreshToken.substring(0, 10)}...`);
      return res.status(401).json({
        success: false,
        message: '无效的刷新令牌'
      });
    }
    
    // 生成新令牌
    const token = user.generateAuthToken();
    logger.info(`刷新令牌成功: ${user.email}`);
    
    res.status(200).json({
      success: true,
      token
    });
  } catch (error) {
    logger.error(`刷新令牌错误: ${error.message}`);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    注销用户（使刷新令牌失效）
// @route   POST /api/auth/logout
// @access  Private
exports.logout = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.id, {
      refreshToken: null
    });
    
    res.status(200).json({
      success: true,
      message: '注销成功'
    });
  } catch (error) {
    console.error('注销错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    使用验证码验证用户邮箱
// @route   POST /api/auth/verify-email
// @access  Public
exports.verifyEmailWithCode = async (req, res) => {
  try {
    const { email, verificationCode } = req.body;
    
    if (!email || !verificationCode) {
      return res.status(400).json({
        success: false,
        message: '邮箱和验证码都是必需的'
      });
    }
    
    const user = await User.findOne({
      email,
      verificationCode,
      verificationExpire: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).json({
        success: false,
        message: '无效或过期的验证码'
      });
    }
    
    // 更新用户状态
    user.isVerified = true;
    user.verificationCode = undefined;
    user.verificationToken = undefined;
    user.verificationExpire = undefined;
    await user.save();
    
    res.status(200).json({
      success: true,
      message: '邮箱验证成功'
    });
  } catch (error) {
    logger.error(`邮箱验证错误: ${error.message}`);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    请求密码重置
// @route   POST /api/auth/password-reset
// @access  Public
exports.forgotPassword = async (req, res) => {
  try {
    const { email, resetCode: customResetCode } = req.body;
    
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '该邮箱未注册'
      });
    }
    
    // 生成重置令牌（保留原有方式）
    const resetToken = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    
    // 使用自定义重置码或生成新的重置码
    const resetCode = customResetCode || generateCode(6);
    user.resetPasswordCode = resetCode;
    
    user.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // 15分钟有效期
    
    await user.save();
    
    // 发送密码重置邮件
    const appName = process.env.APP_NAME || 'FREEDOM AI 用户认证系统';
    try {
      await emailService.transporter.sendMail({
        from: `"${emailService.config.from.name}" <${emailService.config.from.email}>`,
        to: user.email,
        subject: emailService.config.templates.resetPassword.subject,
        html: handlebars.compile(emailService.config.templates.resetPassword.body)({
          email: user.email,
          resetCode: resetCode,
          appName: appName
        })
      });
      
      logger.info(`密码重置邮件已发送至 ${user.email}`);
    } catch (emailError) {
      logger.error(`发送密码重置邮件失败: ${emailError.message}`);
      
      // 如果邮件发送失败，回滚重置验证码
      user.resetPasswordCode = undefined;
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });
      
      return res.status(500).json({
        success: false,
        message: '发送密码重置邮件失败，请稍后再试'
      });
    }
    
    // 在响应中包含重置码（仅在测试环境中）
    const responseData = {
      success: true,
      message: '密码重置邮件已发送'
    };
    
    if (process.env.NODE_ENV === 'development') {
      responseData.resetCode = resetCode;
    }
    
    res.status(200).json(responseData);
  } catch (error) {
    logger.error(`密码重置请求错误: ${error.message}`);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    使用验证码重置密码
// @route   POST /api/auth/password-reset/verify
// @access  Public
exports.resetPasswordWithCode = async (req, res) => {
  try {
    const { email, resetCode, newPassword } = req.body;
    
    if (!email || !resetCode || !newPassword) {
      return res.status(400).json({
        success: false,
        message: '邮箱、验证码和新密码都是必需的'
      });
    }
    
    const user = await User.findOne({
      email,
      resetPasswordCode: resetCode,
      resetPasswordExpire: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).json({
        success: false,
        message: '无效或过期的验证码'
      });
    }
    
    // 设置新密码
    user.password = newPassword;
    user.resetPasswordCode = undefined;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    user.passwordChangedAt = Date.now();
    
    await user.save();
    
    res.status(200).json({
      success: true,
      message: '密码重置成功'
    });
  } catch (error) {
    logger.error(`密码重置错误: ${error.message}`);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    开启/关闭双因素认证
// @route   POST /api/auth/toggle-mfa
// @access  Private
exports.toggleMFA = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    // 切换MFA状态
    user.isTwoFactorEnabled = !user.isTwoFactorEnabled;
    await user.save();
    
    res.status(200).json({
      success: true,
      message: user.isTwoFactorEnabled ? 'MFA认证已启用' : 'MFA认证已禁用',
      isTwoFactorEnabled: user.isTwoFactorEnabled
    });
  } catch (error) {
    logger.error(`切换MFA错误: ${error.message}`);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    验证用户邮箱（基于链接）
// @route   GET /api/auth/verify-email/:token
// @access  Public
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;
    
    const user = await User.findOne({
      verificationToken: token,
      verificationExpire: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).json({
        success: false,
        message: '无效或过期的验证链接'
      });
    }
    
    // 更新用户状态
    user.isVerified = true;
    user.verificationCode = undefined;
    user.verificationToken = undefined;
    user.verificationExpire = undefined;
    await user.save();
    
    res.status(200).json({
      success: true,
      message: '邮箱验证成功'
    });
  } catch (error) {
    logger.error(`邮箱验证错误: ${error.message}`);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    重置密码（基于链接）
// @route   PUT /api/auth/password-reset/:token
// @access  Public
exports.resetPassword = async (req, res) => {
  try {
    // 获取URL中的令牌并哈希它
    const { token } = req.params;
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');
    
    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).json({
        success: false,
        message: '无效或过期的密码重置令牌'
      });
    }
    
    // 设置新密码
    user.password = req.body.password;
    user.resetPasswordCode = undefined;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    user.passwordChangedAt = Date.now();
    
    await user.save();
    
    res.status(200).json({
      success: true,
      message: '密码重置成功'
    });
  } catch (error) {
    logger.error(`密码重置错误: ${error.message}`);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
