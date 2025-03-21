const User = require('../models/User');
const { validationResult } = require('express-validator');

// @desc    获取当前用户信息
// @route   GET /api/users/me
// @access  Private
exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    console.error('获取当前用户错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    更新当前用户信息
// @route   PUT /api/users/me
// @access  Private
exports.updateCurrentUser = async (req, res) => {
  try {
    // 检查验证错误
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    // 确定哪些字段可以更新
    const allowedUpdates = ['username', 'avatar', 'bio'];
    const requestedUpdates = Object.keys(req.body);
    
    // 过滤掉不允许更新的字段
    const updates = {};
    requestedUpdates.forEach(update => {
      if (allowedUpdates.includes(update)) {
        updates[update] = req.body[update];
      }
    });
    
    // 如果更新用户名，检查是否已存在
    if (updates.username) {
      const existingUser = await User.findOne({ 
        username: updates.username,
        _id: { $ne: req.user.id }
      });
      
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: '该用户名已被使用'
        });
      }
    }
    
    // 更新用户
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updates },
      { new: true, runValidators: true }
    );
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    res.status(200).json({
      success: true,
      message: '用户信息更新成功',
      user
    });
  } catch (error) {
    console.error('更新用户错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    更新密码
// @route   PUT /api/users/me/password
// @access  Private
exports.updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    // 获取用户（包含密码字段）
    const user = await User.findById(req.user.id).select('+password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    // 验证当前密码
    const isMatch = await user.comparePassword(currentPassword);
    
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: '当前密码不正确'
      });
    }
    
    // 设置新密码
    user.password = newPassword;
    user.passwordChangedAt = Date.now();
    await user.save();
    
    res.status(200).json({
      success: true,
      message: '密码更新成功'
    });
  } catch (error) {
    console.error('更新密码错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    获取用户列表（管理员功能）
// @route   GET /api/users
// @access  Private/Admin
exports.getUsers = async (req, res) => {
  try {
    // 分页参数
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;
    
    // 查询参数
    const filter = {};
    if (req.query.role) filter.role = req.query.role;
    if (req.query.isVerified) filter.isVerified = req.query.isVerified === 'true';
    
    // 执行查询
    const users = await User.find(filter)
      .skip(skip)
      .limit(limit)
      .select('-refreshToken');
    
    // 统计总数
    const total = await User.countDocuments(filter);
    
    res.status(200).json({
      success: true,
      count: users.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      users
    });
  } catch (error) {
    console.error('获取用户列表错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    获取单个用户信息（管理员功能）
// @route   GET /api/users/:id
// @access  Private/Admin
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-refreshToken');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    console.error('获取用户错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    更新用户（管理员功能）
// @route   PUT /api/users/:id
// @access  Private/Admin
exports.updateUser = async (req, res) => {
  try {
    // 确定哪些字段可以更新
    const allowedUpdates = ['username', 'role', 'isVerified', 'isLocked'];
    const requestedUpdates = Object.keys(req.body);
    
    // 过滤掉不允许更新的字段
    const updates = {};
    requestedUpdates.forEach(update => {
      if (allowedUpdates.includes(update)) {
        updates[update] = req.body[update];
      }
    });
    
    // 如果更新用户名，检查是否已存在
    if (updates.username) {
      const existingUser = await User.findOne({ 
        username: updates.username,
        _id: { $ne: req.params.id }
      });
      
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: '该用户名已被使用'
        });
      }
    }
    
    // 更新用户
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    res.status(200).json({
      success: true,
      message: '用户更新成功',
      user
    });
  } catch (error) {
    console.error('更新用户错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    删除用户（管理员功能）
// @route   DELETE /api/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    // 防止删除超级管理员
    if (user.role === 'superadmin') {
      return res.status(403).json({
        success: false,
        message: '不能删除超级管理员'
      });
    }
    
    await user.deleteOne();
    
    res.status(200).json({
      success: true,
      message: '用户删除成功'
    });
  } catch (error) {
    console.error('删除用户错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
