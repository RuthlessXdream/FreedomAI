const express = require('express');
const { body } = require('express-validator');
const userController = require('../controllers/userController');
const { protect, authorize } = require('../middlewares/authMiddleware');

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
  userController.updateUser
);

// 删除用户
router.delete(
  '/:id',
  protect,
  authorize('admin', 'superadmin'),
  userController.deleteUser
);

module.exports = router;
