const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, '用户名是必需的'],
      unique: true,
      trim: true,
      minlength: [3, '用户名至少需要3个字符'],
      maxlength: [50, '用户名不能超过50个字符']
    },
    email: {
      type: String,
      required: [true, '邮箱是必需的'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, '请提供有效的邮箱地址']
    },
    password: {
      type: String,
      required: [true, '密码是必需的'],
      minlength: [6, '密码至少需要6个字符'],
      select: false // 默认查询不返回密码
    },
    role: {
      type: String,
      enum: ['user', 'admin', 'superadmin'],
      default: 'user'
    },
    avatar: {
      type: String,
      default: ''
    },
    bio: {
      type: String,
      maxlength: [200, '个人简介不能超过200个字符']
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    verificationToken: String,
    verificationExpire: Date,
    verificationCode: String,
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    resetPasswordCode: String,
    mfaCode: String,
    mfaExpire: Date,
    lastLogin: Date,
    refreshToken: {
      type: String,
      default: null
    },
    twoFactorSecret: String,
    isTwoFactorEnabled: {
      type: Boolean,
      default: false
    },
    loginAttempts: {
      type: Number,
      default: 0
    },
    isLocked: {
      type: Boolean,
      default: false
    },
    lockUntil: Date,
    passwordChangedAt: Date
  },
  {
    timestamps: true
  }
);

// 保存前加密密码
userSchema.pre('save', async function (next) {
  // 只有密码存在且被修改时才加密
  if (!this.isModified('password') || !this.password) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// 比较密码
userSchema.methods.comparePassword = async function (candidatePassword) {
  // 如果没有提供候选密码或当前密码不存在，返回false
  if (!candidatePassword || !this.password) {
    return false;
  }
  return await bcrypt.compare(candidatePassword, this.password);
};

// 生成JWT令牌
userSchema.methods.generateAuthToken = function () {
  return jwt.sign(
    { id: this._id, role: this.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
};

// 生成刷新令牌
userSchema.methods.generateRefreshToken = async function () {
  try {
    const refreshToken = jwt.sign(
      { id: this._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN }
    );
    
    // 直接保存到数据库
    this.refreshToken = refreshToken;
    await this.save({ validateBeforeSave: false });
    
    return refreshToken;
  } catch (error) {
    console.error('生成刷新令牌错误:', error);
    throw error;
  }
};

// 检查用户是否应该被锁定
userSchema.methods.incLoginAttempts = async function() {
  // 如果之前有锁定但已过期，重置尝试次数
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 }
    });
  }
  
  // 增加登录尝试次数
  const updates = { $inc: { loginAttempts: 1 } };
  
  // 锁定账户，如果尝试次数超过5次
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = {
      lockUntil: Date.now() + 1000 * 60 * 15, // 锁定15分钟
      isLocked: true
    };
  }
  
  return this.updateOne(updates);
};

// 重置登录尝试次数
userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $set: { loginAttempts: 0 },
    $unset: { lockUntil: 1, isLocked: false }
  });
};

const User = mongoose.model('User', userSchema);

module.exports = User;
