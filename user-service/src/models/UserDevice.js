const mongoose = require('mongoose');

const userDeviceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    deviceId: {
      type: String,
      required: true
    },
    deviceName: {
      type: String,
      default: '未知设备'
    },
    deviceType: {
      type: String,
      enum: ['mobile', 'desktop', 'tablet', 'other'],
      default: 'other'
    },
    browser: {
      type: String,
      default: '未知浏览器'
    },
    operatingSystem: {
      type: String,
      default: '未知操作系统'
    },
    ipAddress: {
      type: String,
      required: true
    },
    lastLocation: {
      type: String,
      default: '未知位置'
    },
    lastUsed: {
      type: Date,
      default: Date.now
    },
    isActive: {
      type: Boolean,
      default: true
    },
    isTrusted: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

// 为查询创建索引
userDeviceSchema.index({ userId: 1, deviceId: 1 }, { unique: true });
userDeviceSchema.index({ userId: 1, isActive: 1 });
userDeviceSchema.index({ lastUsed: 1 });

// 格式化设备信息
userDeviceSchema.methods.toJSON = function() {
  const device = this.toObject();
  
  // 处理返回数据，如果需要格式化
  const formattedDevice = {
    id: device._id,
    deviceName: device.deviceName,
    deviceType: device.deviceType,
    browser: device.browser,
    operatingSystem: device.operatingSystem,
    lastLocation: device.lastLocation,
    lastUsed: device.lastUsed,
    isActive: device.isActive,
    isTrusted: device.isTrusted,
    ipAddress: device.ipAddress.split('.').slice(0, 2).join('.') + '.*.*', // 部分隐藏IP地址
    createdAt: device.createdAt
  };
  
  return formattedDevice;
};

module.exports = mongoose.model('UserDevice', userDeviceSchema); 