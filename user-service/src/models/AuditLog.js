const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    username: {
      type: String,
      required: true
    },
    action: {
      type: String,
      required: true,
      enum: [
        'USER_CREATE',       // 创建用户
        'USER_UPDATE',       // 更新用户
        'USER_DELETE',       // 删除用户
        'USER_BATCH_UPDATE', // 批量更新用户
        'LOGIN_SUCCESS',     // 登录成功
        'LOGIN_FAILED',      // 登录失败
        'PASSWORD_CHANGE',   // 密码修改
        'PASSWORD_RESET',    // 密码重置
        'MFA_ENABLE',        // 启用多因素认证
        'MFA_DISABLE',       // 禁用多因素认证
        'ACCOUNT_LOCK',      // 账户锁定
        'ACCOUNT_UNLOCK'     // 账户解锁
      ]
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    targetUsername: {
      type: String
    },
    details: {
      type: Object
    },
    ipAddress: {
      type: String,
      required: true
    },
    userAgent: {
      type: String
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

// 添加索引以提高查询效率
auditLogSchema.index({ userId: 1 });
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ targetId: 1 });
auditLogSchema.index({ createdAt: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema); 