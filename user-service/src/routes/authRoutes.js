const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

// 临时管理路由 - 仅用于测试
router.post('/admin/delete-user', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: '邮箱是必需的'
      });
    }
    
    // 构建查询
    const [username, domain] = email.split('@');
    const emailRegex = new RegExp(`^${username}(\\+.*)?@${domain}$`);
    
    // 获取User模型
    const User = require('../models/User');
    
    // 查找并删除用户
    const result = await User.deleteMany({ email: emailRegex });
    
    res.status(200).json({
      success: true,
      message: `已删除 ${result.deletedCount} 个用户`
    });
  } catch (error) {
    console.error('删除用户失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: error.message
    });
  }
});

// 用户注册
router.post(
  '/register',
  [
    body('username')
      .isLength({ min: 3, max: 50 })
      .withMessage('用户名长度应在3-50个字符之间')
      .trim(),
    body('email')
      .isEmail()
      .withMessage('请提供有效的邮箱地址')
      .normalizeEmail(),
    body('password')
      .isLength({ min: 6 })
      .withMessage('密码长度至少为6个字符')
  ],
  authController.register
);

// 用户登录
router.post(
  '/login',
  [
    body('email')
      .isEmail()
      .withMessage('请提供有效的邮箱地址')
      .normalizeEmail(),
    body('password')
      .exists()
      .withMessage('请提供密码')
  ],
  authController.login
);

// MFA验证
router.post('/verify-mfa', authController.verifyMFA);

// 刷新令牌
router.post('/refresh-token', authController.refreshToken);

// 用户注销
router.post('/logout', protect, authController.logout);

// 验证邮箱
router.get('/verify-email/:token', authController.verifyEmail);

// 验证邮箱 (新增基于验证码的方式)
router.post('/verify-email', [
  body('email').isEmail().withMessage('请提供有效的邮箱地址').normalizeEmail(),
  body('verificationCode').exists().withMessage('请提供验证码')
], authController.verifyEmailWithCode);

// 请求密码重置
router.post(
  '/password-reset',
  [
    body('email')
      .isEmail()
      .withMessage('请提供有效的邮箱地址')
      .normalizeEmail()
  ],
  authController.forgotPassword
);

// 重置密码
router.put(
  '/password-reset/:token',
  [
    body('password')
      .isLength({ min: 6 })
      .withMessage('密码长度至少为6个字符')
  ],
  authController.resetPassword
);

// 重置密码 (新增基于验证码的方式)
router.post(
  '/password-reset/verify',
  [
    body('email').isEmail().withMessage('请提供有效的邮箱地址').normalizeEmail(),
    body('resetCode').exists().withMessage('请提供重置验证码'),
    body('newPassword').isLength({ min: 6 }).withMessage('密码长度至少为6个字符')
  ],
  authController.resetPasswordWithCode
);

// 开启/关闭双因素认证
router.post('/toggle-mfa', protect, authController.toggleMFA);

module.exports = router;
