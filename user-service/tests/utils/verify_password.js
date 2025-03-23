/**
 * 验证用户密码
 * 用于开发和调试
 * 使用方法：node verify_password.js <邮箱> <密码>
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config();

const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  console.error('参数错误：请提供邮箱和密码');
  console.error('使用方法：node verify_password.js <邮箱> <密码>');
  process.exit(1);
}

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB 已连接: ${conn.connection.host}`);
    
    // 查找用户
    const user = await mongoose.connection.db.collection('users').findOne({ email });
    
    if (!user) {
      console.log('用户不存在');
      mongoose.connection.close();
      return;
    }
    
    console.log('==========================================');
    console.log(`用户信息:`);
    console.log(`ID: ${user._id}`);
    console.log(`用户名: ${user.username}`);
    console.log(`邮箱: ${user.email}`);
    console.log(`已验证: ${user.isVerified ? '是' : '否'}`);
    console.log(`双因素认证: ${user.isTwoFactorEnabled ? '启用' : '禁用'}`);
    console.log('==========================================');
    
    // 验证密码
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (isMatch) {
      console.log('✅ 密码验证成功');
    } else {
      console.log('❌ 密码验证失败');
      console.log(`存储的密码哈希: ${user.password.substring(0, 20)}...`);
    }
    
    mongoose.connection.close();
  } catch (error) {
    console.error(`错误: ${error.message}`);
    process.exit(1);
  }
};

connectDB(); 