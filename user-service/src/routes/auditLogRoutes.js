const express = require('express');
const auditLogController = require('../controllers/auditLogController');
const { protect, authorize } = require('../middlewares/authMiddleware');

const router = express.Router();

// 所有审计日志路由都需要管理员权限

// 获取审计日志摘要（最近活动、操作分布等）
router.get(
  '/summary',
  protect,
  authorize('admin', 'superadmin'),
  auditLogController.getAuditSummary
);

// 获取用户操作历史
router.get(
  '/user/:userId',
  protect,
  authorize('admin', 'superadmin'),
  auditLogController.getUserHistory
);

// 导出审计日志（CSV格式）
router.get(
  '/export',
  protect,
  authorize('admin', 'superadmin'),
  auditLogController.exportAuditLogs
);

// 获取审计日志列表
router.get(
  '/',
  protect,
  authorize('admin', 'superadmin'),
  auditLogController.getAuditLogs
);

// 获取单个审计日志详情
router.get(
  '/:id',
  protect,
  authorize('admin', 'superadmin'),
  auditLogController.getAuditLogById
);

module.exports = router; 