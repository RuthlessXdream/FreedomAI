const express = require('express');
const { body } = require('express-validator');
const userController = require('../controllers/userController');
const { protect, authorize } = require('../middlewares/authMiddleware');
const { createAuditLog } = require('../middlewares/auditLogMiddleware');

const router = express.Router();

// 获取当前用户信息
router.get('/me', protect, userController.getCurrentUser);

// 更新当前用户信息
router.put(
  '/me',
  protect,
  [
    body('username')
      .optional()
      .isLength({ min: 3, max: 50 })
      .withMessage('用户名长度应在3-50个字符之间')
      .trim(),
    body('bio')
      .optional()
      .isLength({ max: 200 })
      .withMessage('个人简介不能超过200个字符')
  ],
  userController.updateCurrentUser
);

// 更新密码
router.put(
  '/me/password',
  protect,
  [
    body('currentPassword')
      .exists()
      .withMessage('请提供当前密码'),
    body('newPassword')
      .isLength({ min: 6 })
      .withMessage('新密码长度至少为6个字符')
  ],
  userController.updatePassword
);

// 以下路由需要管理员权限

// 创建用户（管理员功能）
router.post(
  '/',
  protect,
  authorize('admin', 'superadmin'),
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
      .withMessage('密码长度至少为6个字符'),
    body('role')
      .optional()
      .isIn(['user', 'admin'])
      .withMessage('角色必须是user或admin'),
    body('isVerified')
      .optional()
      .isBoolean()
      .withMessage('isVerified必须是布尔值')
  ],
  createAuditLog('USER_CREATE'),
  userController.createUser
);

// 获取所有用户
router.get(
  '/',
  protect,
  authorize('admin', 'superadmin'),
  userController.getUsers
);

// 获取单个用户
router.get(
  '/:id',
  protect,
  authorize('admin', 'superadmin'),
  userController.getUserById
);

// 更新用户
router.put(
  '/:id',
  protect,
  authorize('admin', 'superadmin'),
  createAuditLog('USER_UPDATE'),
  userController.updateUser
);

// 删除用户
router.delete(
  '/:id',
  protect,
  authorize('admin', 'superadmin'),
  createAuditLog('USER_DELETE'),
  userController.deleteUser
);

// 批量更新用户
router.patch(
  '/batch',
  protect,
  authorize('admin', 'superadmin'),
  [
    body('userIds')
      .isArray()
      .withMessage('userIds必须是数组'),
    body('userIds.*')
      .isMongoId()
      .withMessage('userIds必须包含有效的MongoDB ID'),
    body('updates')
      .isObject()
      .withMessage('updates必须是对象'),
    body('updates.role')
      .optional()
      .isIn(['user', 'admin'])
      .withMessage('角色必须是user或admin'),
    body('updates.isVerified')
      .optional()
      .isBoolean()
      .withMessage('isVerified必须是布尔值'),
    body('updates.isLocked')
      .optional()
      .isBoolean()
      .withMessage('isLocked必须是布尔值')
  ],
  createAuditLog('USER_BATCH_UPDATE'),
  userController.batchUpdateUsers
);

module.exports = router;
