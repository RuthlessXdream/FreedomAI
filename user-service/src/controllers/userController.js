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
    
    // 基本筛选条件
    if (req.query.role) filter.role = req.query.role;
    if (req.query.isVerified !== undefined) filter.isVerified = req.query.isVerified === 'true';
    if (req.query.isLocked !== undefined) filter.isLocked = req.query.isLocked === 'true';
    
    // 搜索功能
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      filter.$or = [
        { username: searchRegex },
        { email: searchRegex }
      ];
    }
    
    // 日期范围筛选
    if (req.query.createdAfter || req.query.createdBefore) {
      filter.createdAt = {};
      
      if (req.query.createdAfter) {
        filter.createdAt.$gte = new Date(req.query.createdAfter);
      }
      
      if (req.query.createdBefore) {
        filter.createdAt.$lte = new Date(req.query.createdBefore);
      }
    }
    
    // 排序
    const sortField = req.query.sortField || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    const sort = { [sortField]: sortOrder };
    
    // 执行查询
    const users = await User.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .select('-refreshToken -password');
    
    // 统计总数
    const total = await User.countDocuments(filter);
    
    // 构建分页链接
    const baseUrl = `${req.protocol}://${req.get('host')}${req.baseUrl}`;
    const totalPages = Math.ceil(total / limit);
    
    const pagination = {
      total,
      totalPages,
      currentPage: page,
      limit,
      hasPrevPage: page > 1,
      hasNextPage: page < totalPages
    };
    
    // 添加前一页和下一页链接
    if (pagination.hasPrevPage) {
      pagination.prevPage = `${baseUrl}?page=${page - 1}&limit=${limit}`;
    }
    
    if (pagination.hasNextPage) {
      pagination.nextPage = `${baseUrl}?page=${page + 1}&limit=${limit}`;
    }
    
    res.status(200).json({
      success: true,
      count: users.length,
      pagination,
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

// @desc    创建用户（管理员功能）
// @route   POST /api/users
// @access  Private/Admin
exports.createUser = async (req, res) => {
  try {
    // 检查验证错误
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { username, email, password, role, isVerified } = req.body;
    
    // 检查用户是否已存在
    let existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });
    
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: '用户名或邮箱已被注册'
      });
    }
    
    // 创建新用户
    const user = new User({
      username,
      email,
      password,
      // 只允许创建user或admin角色，防止创建superadmin
      role: role === 'admin' ? 'admin' : 'user',
      // 管理员创建的用户可以直接设置为已验证状态
      isVerified: isVerified === true
    });
    
    await user.save();
    
    // 返回新创建的用户信息（不包含密码）
    res.status(201).json({
      success: true,
      message: '用户创建成功',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('创建用户错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    批量更新用户（管理员功能）
// @route   PATCH /api/users/batch
// @access  Private/Admin
exports.batchUpdateUsers = async (req, res) => {
  try {
    // 检查验证错误
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { userIds, updates } = req.body;
    
    // 验证userIds是否为数组且不为空
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请提供有效的用户ID数组'
      });
    }
    
    // 定义允许的批量更新字段
    const allowedUpdates = ['role', 'isVerified', 'isLocked'];
    const requestedUpdates = Object.keys(updates || {});
    
    // 验证更新字段
    const hasValidUpdates = requestedUpdates.some(update => allowedUpdates.includes(update));
    if (!hasValidUpdates || requestedUpdates.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请提供至少一个有效的更新字段'
      });
    }
    
    // 过滤只允许的更新字段
    const validUpdates = {};
    requestedUpdates.forEach(update => {
      if (allowedUpdates.includes(update)) {
        validUpdates[update] = updates[update];
      }
    });
    
    // 防止将用户角色更新为superadmin
    if (validUpdates.role === 'superadmin') {
      validUpdates.role = 'admin';
    }
    
    // 记录更新前查找superadmin用户数量
    const superAdminCount = await User.countDocuments({ 
      _id: { $in: userIds }, 
      role: 'superadmin'
    });
    
    // 执行批量更新，但排除superadmin角色的用户
    const result = await User.updateMany(
      { 
        _id: { $in: userIds },
        role: { $ne: 'superadmin' } // 排除superadmin用户
      },
      { $set: validUpdates }
    );
    
    // 计算实际更新的用户数
    const updatedCount = result.modifiedCount;
    const notUpdatedCount = userIds.length - updatedCount;
    const superAdminProtected = superAdminCount > 0 ? superAdminCount : 0;
    
    res.status(200).json({
      success: true,
      message: '批量更新用户成功',
      stats: {
        totalRequested: userIds.length,
        updatedCount: updatedCount,
        notUpdatedCount: notUpdatedCount,
        superAdminProtected: superAdminProtected
      }
    });
  } catch (error) {
    console.error('批量更新用户错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
