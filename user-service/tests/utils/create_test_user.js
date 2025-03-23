/**
 * 创建测试用户
 * 用于开发和调试
 * 使用方法：node create_test_user.js <用户名> <邮箱> <密码>
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config();

const username = process.argv[2] || `test_${Date.now()}`;
const email = process.argv[3] || `test${Date.now()}@example.com`;
const password = process.argv[4] || 'password123';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB 已连接: ${conn.connection.host}`);
    
    // 生成密码哈希
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // 创建用户
    const newUser = {
      username,
      email,
      password: hashedPassword,
      role: 'user',
      isVerified: true,
      verificationToken: null,
      verificationExpires: null,
      isTwoFactorEnabled: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // 插入用户
    const result = await mongoose.connection.db.collection('users').insertOne(newUser);
    
    console.log('==========================================');
    console.log('✅ 测试用户创建成功');
    console.log('==========================================');
    console.log(`用户ID: ${result.insertedId}`);
    console.log(`用户名: ${username}`);
    console.log(`邮箱: ${email}`);
    console.log(`密码: ${password}`);
    console.log(`密码哈希: ${hashedPassword}`);
    console.log('==========================================');
    
    mongoose.connection.close();
  } catch (error) {
    console.error(`错误: ${error.message}`);
    process.exit(1);
  }
};

connectDB(); 