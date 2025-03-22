/**
 * 重置用户密码脚本
 */
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

const MONGO_URI = 'mongodb://localhost:27017/user-service';

async function resetPassword() {
  try {
    console.log('开始重置用户密码...');
    
    // 连接数据库
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    console.log('已连接到数据库');
    
    const db = client.db();
    
    // 要重置密码的用户邮箱
    const email = process.argv[2]; 
    if (!email) {
      console.error('请提供用户邮箱作为参数');
      await client.close();
      return;
    }
    
    // 新密码
    const newPassword = process.argv[3] || 'Password123!';
    
    // 对密码进行哈希
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // 查找用户
    const user = await db.collection('users').findOne({ email });
    
    if (!user) {
      console.error(`未找到用户: ${email}`);
      await client.close();
      return;
    }
    
    console.log(`找到用户: ${user.username} (${user.email})`);
    
    // 重置密码并解锁账户
    const updateResult = await db.collection('users').updateOne(
      { email },
      { 
        $set: { 
          password: hashedPassword,
          loginAttempts: 0,
          isLocked: false
        },
        $unset: { lockUntil: "" }
      }
    );
    
    if (updateResult.modifiedCount > 0) {
      console.log('密码重置成功');
      console.log('账户已解锁');
      console.log(`新密码: ${newPassword}`);
    } else {
      console.log('密码重置失败 - 没有修改数据');
    }
    
    // 显示更新后的用户数据（不包括密码）
    const updatedUser = await db.collection('users').findOne({ email });
    console.log('更新后的用户状态:');
    console.log(` - 用户ID: ${updatedUser._id}`);
    console.log(` - 用户名: ${updatedUser.username}`);
    console.log(` - 邮箱: ${updatedUser.email}`);
    console.log(` - MFA已启用: ${updatedUser.isTwoFactorEnabled}`);
    console.log(` - 登录尝试次数: ${updatedUser.loginAttempts}`);
    console.log(` - 账户是否锁定: ${updatedUser.isLocked}`);
    
    await client.close();
    console.log('数据库连接已关闭');
  } catch (error) {
    console.error('密码重置错误:', error.message);
  }
}

// 执行脚本
resetPassword().catch(console.error); 