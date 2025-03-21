const User = require('../models/User');
const { validationResult } = require('express-validator');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const emailService = require('../utils/emailService');
const logger = require('../utils/logger');
const path = require('path');
const handlebars = require('handlebars');

// 辅助函数：创建并发送令牌
const createSendToken = (user, statusCode, res) => {
  // 生成访问令牌
  const token = user.generateAuthToken();
  
  // 生成刷新令牌
  const refreshToken = user.generateRefreshToken();
  
  // 保存刷新令牌到用户记录
  user.refreshToken = refreshToken;
  user.lastLogin = Date.now();
  user.save({ validateBeforeSave: false });
  
  // 从响应中移除敏感字段
  user.password = undefined;
  user.refreshToken = undefined;
  
  res.status(statusCode).json({
    success: true,
    token,
    refreshToken,
    user
  });
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
        }),
        attachments: [
          {
            filename: 'logo.png',
            path: path.join(__dirname, '../../logo.png'),
            cid: 'logo'
          },
          {
            filename: 'logo-small.png',
            path: path.join(__dirname, '../../logo.png'),
            cid: 'logo-small'
          }
        ]
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
    
    // 检查用户是否存在
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: '无效的凭据'
      });
    }
    
    // 检查账户是否被锁定
    if (user.isLocked && user.lockUntil > Date.now()) {
      return res.status(401).json({
        success: false,
        message: `账户已锁定，请在${Math.ceil((user.lockUntil - Date.now()) / 1000 / 60)}分钟后重试`
      });
    }
    
    // 检查密码是否正确
    const isMatch = await user.comparePassword(password);
    
    if (!isMatch) {
      await user.incLoginAttempts();
      
      return res.status(401).json({
        success: false,
        message: '无效的凭据',
        remainingAttempts: Math.max(0, 5 - (user.loginAttempts + 1))
      });
    }
    
    // 重置登录尝试次数
    await user.resetLoginAttempts();
    
    // 检查邮箱是否已验证（如需跳过验证，可删除此检查）
    if (!user.isVerified) {
      return res.status(401).json({
        success: false,
        message: '请先验证您的电子邮件'
      });
    }

    // 如果启用了MFA，则发送MFA验证码
    if (user.isTwoFactorEnabled) {
      // 使用自定义MFA码或生成新的MFA码
      const mfaCode = customMfaCode || generateCode(6);
      const mfaExpire = Date.now() + 5 * 60 * 1000; // 5分钟有效期
      
      user.mfaCode = mfaCode;
      user.mfaExpire = mfaExpire;
      await user.save({ validateBeforeSave: false });
      
      // 发送MFA验证邮件
      const appName = process.env.APP_NAME || 'FREEDOM AI 用户认证系统';
      try {
        await emailService.transporter.sendMail({
          from: `"${emailService.config.from.name}" <${emailService.config.from.email}>`,
          to: user.email,
          subject: emailService.config.templates.mfaVerification.subject,
          html: handlebars.compile(emailService.config.templates.mfaVerification.body)({
            email: user.email,
            mfaCode: mfaCode,
            expireMinutes: 5,
            appName: appName
          }),
          attachments: [
            {
              filename: 'logo.png',
              path: path.join(__dirname, '../../logo.png'),
              cid: 'logo'
            },
            {
              filename: 'logo-small.png',
              path: path.join(__dirname, '../../logo.png'),
              cid: 'logo-small'
            }
          ]
        });
        
        logger.info(`MFA验证邮件已发送至 ${user.email}`);
      } catch (emailError) {
        logger.error(`发送MFA验证邮件失败: ${emailError.message}`);
      }
      
      // 在响应中包含MFA码（仅在测试环境中）
      const responseData = {
        success: true,
        message: '需要MFA验证，验证码已发送到您的邮箱',
        requireMFA: true,
        userId: user._id
      };
      
      if (process.env.NODE_ENV === 'development') {
        responseData.mfaCode = mfaCode;
      }
      
      return res.status(200).json(responseData);
    }
    
    // 创建并发送令牌
    createSendToken(user, 200, res);
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
    createSendToken(user, 200, res);
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
      return res.status(400).json({
        success: false,
        message: '刷新令牌是必需的'
      });
    }
    
    // 验证刷新令牌
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: '无效或过期的刷新令牌'
      });
    }
    
    // 查找用户并检查刷新令牌是否匹配
    const user = await User.findById(decoded.id);
    
    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({
        success: false,
        message: '无效的刷新令牌'
      });
    }
    
    // 生成新令牌
    const token = user.generateAuthToken();
    
    res.status(200).json({
      success: true,
      token
    });
  } catch (error) {
    console.error('令牌刷新错误:', error);
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
        }),
        attachments: [
          {
            filename: 'logo.png',
            path: path.join(__dirname, '../../logo.png'),
            cid: 'logo'
          },
          {
            filename: 'logo-small.png',
            path: path.join(__dirname, '../../logo.png'),
            cid: 'logo-small'
          }
        ]
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
