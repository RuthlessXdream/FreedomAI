/**
 * 清理用户数据脚本
 * 用于删除测试过程中创建的用户
 */

require('dotenv').config();
const mongoose = require('mongoose');
const readline = require('readline');

// 创建一个readline接口，用于获取用户输入
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// 询问用户输入
const question = (query) => new Promise((resolve) => rl.question(query, resolve));

// 连接数据库
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('数据库连接成功');
    return true;
  } catch (error) {
    console.error('数据库连接失败:', error.message);
    return false;
  }
};

// 删除所有用户
const deleteAllUsers = async () => {
  try {
    const result = await mongoose.connection.collection('users').deleteMany({});
    console.log(`已删除 ${result.deletedCount} 个用户`);
    return result.deletedCount;
  } catch (error) {
    console.error('删除用户失败:', error.message);
    return 0;
  }
};

// 按邮箱删除用户
const deleteUserByEmail = async (email) => {
  try {
    const result = await mongoose.connection.collection('users').deleteOne({ email });
    if (result.deletedCount > 0) {
      console.log(`已删除邮箱为 ${email} 的用户`);
      return true;
    } else {
      console.log(`未找到邮箱为 ${email} 的用户`);
      return false;
    }
  } catch (error) {
    console.error('删除用户失败:', error.message);
    return false;
  }
};

// 主函数
const main = async () => {
  try {
    const connected = await connectDB();
    if (!connected) {
      console.error('无法连接到数据库，操作终止');
      process.exit(1);
    }

    console.log('======== 用户数据清理 ========');
    console.log('1. 删除所有用户');
    console.log('2. 按邮箱删除用户');
    
    const choice = await question('请选择操作 (1/2): ');
    
    if (choice === '1') {
      await deleteAllUsers();
    } else if (choice === '2') {
      const email = await question('请输入要删除的用户邮箱: ');
      await deleteUserByEmail(email);
    } else {
      console.log('无效的选择');
    }
    
    console.log('操作完成');
  } catch (error) {
    console.error('操作失败:', error.message);
  } finally {
    mongoose.connection.close();
    rl.close();
  }
};

// 执行主函数
main(); 