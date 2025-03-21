/**
 * 删除指定用户脚本
 */

require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/user-service';

// 要删除的用户邮箱
const usersToDelete = [
  'wyk9@outlook.com',
  'ruthlessxdream@gmail.com'
];

// 连接数据库
async function connectDB() {
  try {
    console.log(`正在连接到数据库: ${MONGODB_URI}`);
    await mongoose.connect(MONGODB_URI);
    console.log('数据库连接成功');
    return true;
  } catch (error) {
    console.error('数据库连接失败:', error.message);
    return false;
  }
}

// 删除指定用户及其变体
async function deleteUsers() {
  // 为每个邮箱构建查询条件
  const queries = usersToDelete.map(email => {
    const [username, domain] = email.split('@');
    // 使用正则表达式匹配基本邮箱和可能的变体 (username+anything@domain)
    return { email: new RegExp(`^${username}(\\+.*)?@${domain}$`) };
  });

  try {
    // 使用 $or 操作符合并所有查询
    const result = await mongoose.connection.collection('users').deleteMany({
      $or: queries
    });

    console.log(`删除结果: 找到 ${result.matchedCount || 0} 个用户，删除了 ${result.deletedCount} 个用户`);
    return result.deletedCount;
  } catch (error) {
    console.error('删除用户时出错:', error.message);
    return 0;
  }
}

// 主函数
async function main() {
  try {
    console.log('======== 删除指定用户 ========');
    console.log(`将删除以下用户及其变体:`);
    usersToDelete.forEach(email => console.log(` - ${email}`));

    const connected = await connectDB();
    if (!connected) {
      console.error('无法连接到数据库，操作终止');
      process.exit(1);
    }

    const deletedCount = await deleteUsers();
    
    if (deletedCount > 0) {
      console.log(`成功删除 ${deletedCount} 个用户`);
    } else {
      console.log('没有找到匹配的用户或删除操作失败');
    }
  } catch (error) {
    console.error('操作失败:', error.message);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('数据库连接已关闭');
    }
  }
}

// 执行主函数
main().catch(err => {
  console.error('未捕获的错误:', err);
  process.exit(1);
}); 