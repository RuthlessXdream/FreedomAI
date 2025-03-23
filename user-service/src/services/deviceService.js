const UserDevice = require('../models/UserDevice');
const crypto = require('crypto');
const UAParser = require('ua-parser-js');

/**
 * 解析用户代理信息
 * @param {String} userAgent - 用户代理字符串
 * @returns {Object} 设备信息对象
 */
const parseUserAgent = (userAgent) => {
  const parser = new UAParser(userAgent);
  const result = parser.getResult();
  
  // 确定设备类型
  let deviceType = 'other';
  if (result.device && result.device.type) {
    if (result.device.type === 'mobile') deviceType = 'mobile';
    else if (result.device.type === 'tablet') deviceType = 'tablet';
    else if (!result.device.type) deviceType = 'desktop';
  } else {
    deviceType = 'desktop'; // 默认为桌面设备
  }
  
  // 构建设备名称
  let deviceName = '未知设备';
  if (result.device && result.device.vendor) {
    deviceName = result.device.vendor;
    if (result.device.model) {
      deviceName += ' ' + result.device.model;
    }
  } else if (result.os && result.os.name) {
    deviceName = result.os.name;
  }
  
  // 构建浏览器信息
  let browser = '未知浏览器';
  if (result.browser && result.browser.name) {
    browser = result.browser.name;
    if (result.browser.version) {
      browser += ' ' + result.browser.version.split('.')[0]; // 只显示主版本号
    }
  }
  
  // 构建操作系统信息
  let operatingSystem = '未知操作系统';
  if (result.os && result.os.name) {
    operatingSystem = result.os.name;
    if (result.os.version) {
      operatingSystem += ' ' + result.os.version;
    }
  }
  
  return {
    deviceType,
    deviceName,
    browser,
    operatingSystem
  };
};

/**
 * 生成设备ID
 * @param {String} userId - 用户ID
 * @param {String} userAgent - 用户代理字符串
 * @param {String} ipAddress - IP地址
 * @returns {String} 设备ID
 */
const generateDeviceId = (userId, userAgent, ipAddress) => {
  const data = userId + userAgent + ipAddress;
  return crypto.createHash('sha256').update(data).digest('hex');
};

/**
 * 记录用户设备登录
 * @param {String} userId - 用户ID
 * @param {String} userAgent - 用户代理字符串
 * @param {String} ipAddress - IP地址
 * @returns {Promise<Object>} 设备信息
 */
exports.recordDeviceLogin = async (userId, userAgent, ipAddress) => {
  try {
    // 解析用户代理
    const deviceInfo = parseUserAgent(userAgent);
    
    // 生成设备ID
    const deviceId = generateDeviceId(userId, userAgent, ipAddress);
    
    // 查找现有设备或创建新设备
    let device = await UserDevice.findOne({ userId, deviceId });
    
    if (device) {
      // 更新现有设备
      device.lastUsed = Date.now();
      device.ipAddress = ipAddress;
      device.isActive = true;
      await device.save();
    } else {
      // 创建新设备记录
      device = await UserDevice.create({
        userId,
        deviceId,
        ipAddress,
        deviceName: deviceInfo.deviceName,
        deviceType: deviceInfo.deviceType,
        browser: deviceInfo.browser,
        operatingSystem: deviceInfo.operatingSystem,
        // Todo: 添加地理位置查询
        lastLocation: '未知位置'
      });
    }
    
    return device;
  } catch (error) {
    console.error('记录设备登录错误:', error);
    throw error;
  }
};

/**
 * 获取用户的所有设备
 * @param {String} userId - 用户ID
 * @returns {Promise<Array>} 设备列表
 */
exports.getUserDevices = async (userId) => {
  try {
    return await UserDevice.find({ userId }).sort({ lastUsed: -1 });
  } catch (error) {
    console.error('获取用户设备错误:', error);
    throw error;
  }
};

/**
 * 获取单个设备信息
 * @param {String} userId - 用户ID
 * @param {String} deviceId - 设备ID
 * @returns {Promise<Object>} 设备信息
 */
exports.getDevice = async (userId, deviceId) => {
  try {
    const device = await UserDevice.findOne({ 
      _id: deviceId,
      userId
    });
    
    if (!device) {
      throw new Error('设备不存在或不属于此用户');
    }
    
    return device;
  } catch (error) {
    console.error('获取设备错误:', error);
    throw error;
  }
};

/**
 * 更新设备信息
 * @param {String} userId - 用户ID
 * @param {String} deviceId - 设备ID
 * @param {Object} updates - 更新内容
 * @returns {Promise<Object>} 更新后的设备信息
 */
exports.updateDevice = async (userId, deviceId, updates) => {
  try {
    // 只允许更新某些字段
    const allowedUpdates = {
      deviceName: updates.deviceName,
      isTrusted: updates.isTrusted
    };
    
    const device = await UserDevice.findOneAndUpdate(
      { _id: deviceId, userId },
      { $set: allowedUpdates },
      { new: true, runValidators: true }
    );
    
    if (!device) {
      throw new Error('设备不存在或不属于此用户');
    }
    
    return device;
  } catch (error) {
    console.error('更新设备错误:', error);
    throw error;
  }
};

/**
 * 移除设备（注销）
 * @param {String} userId - 用户ID
 * @param {String} deviceId - 设备ID
 * @returns {Promise<Boolean>} 操作是否成功
 */
exports.removeDevice = async (userId, deviceId) => {
  try {
    const result = await UserDevice.findOneAndUpdate(
      { _id: deviceId, userId },
      { $set: { isActive: false } }
    );
    
    return !!result;
  } catch (error) {
    console.error('移除设备错误:', error);
    throw error;
  }
};

/**
 * 检查是否是可疑登录
 * @param {String} userId - 用户ID
 * @param {String} ipAddress - IP地址
 * @param {String} userAgent - 用户代理字符串
 * @returns {Promise<Object>} 可疑性评估
 */
exports.checkSuspiciousLogin = async (userId, ipAddress, userAgent) => {
  try {
    // 生成设备ID
    const deviceId = generateDeviceId(userId, userAgent, ipAddress);
    
    // 查找用户以前的登录
    const previousLogins = await UserDevice.find({ userId }).sort({ lastUsed: -1 }).limit(5);
    
    // 如果是新设备
    const isNewDevice = !previousLogins.some(device => device.deviceId === deviceId);
    
    // 如果是不常用的IP
    const isUnusualIP = !previousLogins.some(device => device.ipAddress === ipAddress);
    
    // 如果是不常用的浏览器/设备
    const deviceInfo = parseUserAgent(userAgent);
    const isUnusualBrowser = !previousLogins.some(
      device => device.browser === deviceInfo.browser
    );
    
    // 确定可疑性分数 (0-100)
    let suspicionScore = 0;
    if (isNewDevice) suspicionScore += 40;
    if (isUnusualIP) suspicionScore += 30;
    if (isUnusualBrowser) suspicionScore += 20;
    
    // 简单提高可疑性分数，如果没有可信设备
    const hasTrustedDevice = previousLogins.some(device => device.isTrusted);
    if (!hasTrustedDevice && previousLogins.length > 0) {
      suspicionScore += 10;
    }
    
    // 返回评估结果
    return {
      isNewDevice,
      isUnusualIP,
      isUnusualBrowser,
      suspicionScore,
      isSuspicious: suspicionScore > 50
    };
  } catch (error) {
    console.error('检查可疑登录错误:', error);
    // 出错时默认为不可疑，避免影响用户体验
    return {
      isNewDevice: false,
      isUnusualIP: false,
      isUnusualBrowser: false,
      suspicionScore: 0,
      isSuspicious: false,
      error: error.message
    };
  }
}; 