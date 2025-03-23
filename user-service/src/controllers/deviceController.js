const { validationResult } = require('express-validator');
const deviceService = require('../services/deviceService');
const auditLogService = require('../services/auditLogService');

// @desc    获取用户设备列表
// @route   GET /api/devices
// @access  Private
exports.getUserDevices = async (req, res) => {
  try {
    const devices = await deviceService.getUserDevices(req.user.id);
    
    res.status(200).json({
      success: true,
      count: devices.length,
      devices
    });
  } catch (error) {
    console.error('获取设备列表错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    获取设备详情
// @route   GET /api/devices/:id
// @access  Private
exports.getDeviceById = async (req, res) => {
  try {
    const device = await deviceService.getDevice(req.user.id, req.params.id);
    
    res.status(200).json({
      success: true,
      device
    });
  } catch (error) {
    console.error('获取设备详情错误:', error);
    res.status(500).json({
      success: false,
      message: error.message || '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    更新设备
// @route   PUT /api/devices/:id
// @access  Private
exports.updateDevice = async (req, res) => {
  try {
    // 验证请求
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }
    
    const updates = {};
    if (req.body.deviceName) updates.deviceName = req.body.deviceName;
    if (req.body.isTrusted !== undefined) updates.isTrusted = req.body.isTrusted;
    
    const device = await deviceService.updateDevice(req.user.id, req.params.id, updates);
    
    // 记录审计日志
    const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    auditLogService.createLog({
      userId: req.user.id,
      username: req.user.username,
      action: updates.isTrusted ? 'DEVICE_TRUST' : 'DEVICE_UPDATE',
      ipAddress,
      userAgent: req.headers['user-agent'],
      targetId: device._id,
      details: { updates }
    });
    
    res.status(200).json({
      success: true,
      message: '设备更新成功',
      device
    });
  } catch (error) {
    console.error('更新设备错误:', error);
    res.status(500).json({
      success: false,
      message: error.message || '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    注销设备（从当前会话列表中移除）
// @route   DELETE /api/devices/:id
// @access  Private
exports.removeDevice = async (req, res) => {
  try {
    const success = await deviceService.removeDevice(req.user.id, req.params.id);
    
    if (!success) {
      return res.status(404).json({
        success: false,
        message: '设备不存在或不属于当前用户'
      });
    }
    
    // 记录审计日志
    const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    auditLogService.createLog({
      userId: req.user.id,
      username: req.user.username,
      action: 'DEVICE_REMOVE',
      ipAddress,
      userAgent: req.headers['user-agent'],
      targetId: req.params.id
    });
    
    res.status(200).json({
      success: true,
      message: '设备已注销'
    });
  } catch (error) {
    console.error('注销设备错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}; 