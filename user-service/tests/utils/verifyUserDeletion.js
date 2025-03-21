/**
 * 验证用户是否已被删除
 */
require('dotenv').config();
const { MongoClient } = require('mongodb');

// 要验证的邮箱列表
const emailsToVerify = [
  'wyk9@outlook.com',
  'ruthlessxdream@gmail.com'
];

async function main() {
  // 使用之前成功的连接字符串
  const uri = 'mongodb://localhost:27018/user-service';
  let client = null;
  
  try {
    console.log(`连接到数据库: ${uri}`);
    client = new MongoClient(uri, { 
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
      socketTimeoutMS: 5000
    });
    await client.connect();
    console.log(`连接成功!`);
    
    // 获取数据库和集合
    const db = client.db();
    const users = db.collection('users');
    
    console.log('======== 验证用户删除状态 ========');
    
    // 为每个邮箱检查
    for (const email of emailsToVerify) {
      console.log(`验证邮箱: ${email}`);
      
      // 尝试精确匹配
      const exactMatch = await users.findOne({ email: email });
      
      // 尝试不区分大小写的匹配
      const [username, domain] = email.split('@');
      const regex = new RegExp(`^${username}(\\+.*)?@${domain}$`, 'i');
      const regexMatch = await users.findOne({ email: regex });
      
      if (!exactMatch && !regexMatch) {
        console.log(`✓ 用户 ${email} 已成功删除，数据库中未找到`);
      } else {
        console.log(`× 用户 ${email} 仍存在于数据库中!`);
        if (exactMatch) {
          console.log(`  - 精确匹配: ${exactMatch.username || '未设置用户名'} (${exactMatch.email})`);
        }
        if (regexMatch && (!exactMatch || regexMatch.email !== exactMatch.email)) {
          console.log(`  - 正则匹配: ${regexMatch.username || '未设置用户名'} (${regexMatch.email})`);
        }
      }
    }
    
    // 显示数据库中所有剩余用户的邮箱
    console.log('\n======== 数据库中的剩余用户 ========');
    const allUsers = await users.find({}).toArray();
    console.log(`共有 ${allUsers.length} 个用户:`);
    allUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.username || '未设置用户名'} (${user.email})`);
    });
    
  } catch (err) {
    console.error('操作错误:', err);
  } finally {
    if (client) {
      await client.close().catch(() => {});
      console.log('\n数据库连接已关闭');
    }
  }
}

// 执行主函数
main().catch(console.error); 