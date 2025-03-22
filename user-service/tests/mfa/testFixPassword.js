/**
 * 修复用户密码的测试脚本
 */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../../src/models/User');

const MONGO_URI = 'mongodb://localhost:27017/user-service';

async function fixUserPassword() {
  try {
    console.log('开始修复用户密码...');
    
    // 连接数据库
    await mongoose.connect(MONGO_URI);
    console.log('已连接到数据库');
    
    // 要修复密码的用户邮箱
    const email = process.argv[2] || 'mfatest1742658044225@example.com';
    
    // 新密码
    const newPassword = 'Password123!';
    
    // 对密码进行哈希
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // 查找用户
    const user = await User.findOne({ email });
    
    if (!user) {
      console.error(`未找到用户: ${email}`);
      await mongoose.disconnect();
      return;
    }
    
    console.log(`找到用户: ${user.username} (${user.email})`);
    console.log('用户ID:', user._id);
    
    // 重置密码、登录尝试次数和锁定状态
    user.password = newPassword;
    user.loginAttempts = 0;
    user.isLocked = false;
    user.lockUntil = undefined;
    
    // 保存用户更新
    await user.save();
    
    console.log('密码已重置');
    console.log('账户已解锁');
    console.log(`新密码: ${newPassword}`);
    
    // 验证密码是否保存成功
    const userWithPassword = await User.findOne({ email }).select('+password');
    
    if (userWithPassword && userWithPassword.password) {
      console.log('密码字段存在:', true);
      console.log('密码前20个字符:', userWithPassword.password.substring(0, 20) + '...');
      
      // 测试密码验证
      const isMatch = await userWithPassword.comparePassword(newPassword);
      console.log('密码验证结果:', isMatch ? '成功' : '失败');
    } else {
      console.error('密码字段不存在或为空');
    }
    
    // 断开数据库连接
    await mongoose.disconnect();
    console.log('数据库连接已关闭');
  } catch (error) {
    console.error('修复密码错误:', error.message);
    await mongoose.disconnect();
  }
}

// 执行脚本
fixUserPassword().catch(console.error); 