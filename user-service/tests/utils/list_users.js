/**
 * 列出所有用户
 * 用于开发和调试
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB 已连接: ${conn.connection.host}`);
    
    const users = await mongoose.connection.db.collection('users').find({}).toArray();
    console.log('==========================================');
    console.log(`总计用户数: ${users.length}`);
    console.log('==========================================');
    
    users.forEach((user, index) => {
      console.log(`用户 ${index + 1}:`);
      console.log(`ID: ${user._id}`);
      console.log(`用户名: ${user.username}`);
      console.log(`邮箱: ${user.email}`);
      console.log(`已验证: ${user.isVerified ? '是' : '否'}`);
      console.log(`双因素认证: ${user.isTwoFactorEnabled ? '启用' : '禁用'}`);
      console.log(`创建时间: ${new Date(user.createdAt).toLocaleString()}`);
      console.log('------------------------------------------');
    });
    
    mongoose.connection.close();
  } catch (error) {
    console.error(`错误: ${error.message}`);
    process.exit(1);
  }
};

connectDB(); 