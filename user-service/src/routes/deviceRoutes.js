const express = require('express');
const { body } = require('express-validator');
const deviceController = require('../controllers/deviceController');
const { protect } = require('../middlewares/authMiddleware');
const { createAuditLog } = require('../middlewares/auditLogMiddleware');

const router = express.Router();

// 所有设备路由都需要认证
router.use(protect);

// 获取用户的所有设备
router.get('/', deviceController.getUserDevices);

// 获取单个设备详情
router.get('/:id', deviceController.getDeviceById);

// 更新设备信息
router.put(
  '/:id',
  [
    body('deviceName')
      .optional()
      .isString()
      .isLength({ min: 1, max: 100 })
      .withMessage('设备名称长度应在1-100个字符之间'),
    body('isTrusted')
      .optional()
      .isBoolean()
      .withMessage('isTrusted必须是布尔值')
  ],
  deviceController.updateDevice
);

// 注销设备
router.delete('/:id', deviceController.removeDevice);

module.exports = router; 