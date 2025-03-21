/**
 * 直接连接MongoDB删除用户
 */
require('dotenv').config();
const { MongoClient } = require('mongodb');

// 要删除的邮箱列表
const emailsToDelete = [
  'wyk9@outlook.com',
  'ruthlessxdream@gmail.com'
];

async function main() {
  // 尝试不同的MongoDB连接字符串
  const connectionStrings = [
    process.env.MONGODB_URI,
    'mongodb://localhost:27017/user-service',
    'mongodb://127.0.0.1:27017/user-service',
    'mongodb://localhost:27018/user-service', // Docker映射端口
    'mongodb://127.0.0.1:27018/user-service', // Docker映射端口
    'mongodb://mongo:27017/user-service',     // Docker环境
    'mongodb://user-db:27017/user-service',   // Docker compose服务名
    'mongodb://database:27017/user-service'   // 可能的Docker网络名
  ];
  
  let client = null;
  let connected = false;
  
  // 尝试每个连接字符串
  for (const uri of connectionStrings) {
    if (!uri) continue;
    
    try {
      console.log(`尝试连接: ${uri}`);
      client = new MongoClient(uri, { 
        serverSelectionTimeoutMS: 5000, // 增加超时时间到5秒
        connectTimeoutMS: 5000,
        socketTimeoutMS: 5000
      });
      await client.connect();
      console.log(`成功连接到: ${uri}`);
      connected = true;
      break;
    } catch (err) {
      console.log(`连接失败: ${uri}`);
      console.log(`  错误: ${err.message}`);
      if (client) {
        await client.close().catch(() => {}); // 忽略关闭连接时的错误
        client = null;
      }
    }
  }
  
  if (!connected || !client) {
    console.error('无法连接到任何MongoDB实例');
    return;
  }
  
  try {
    // 获取数据库和集合
    const db = client.db();
    const users = db.collection('users');
    
    console.log('======== 删除指定用户 ========');
    
    // 为每个邮箱构建查询
    for (const email of emailsToDelete) {
      console.log(`正在处理: ${email}`);
      
      // 先尝试精确匹配
      let foundUsers = await users.find({ email: email }).toArray();
      
      // 如果没找到，尝试不区分大小写的匹配
      if (foundUsers.length === 0) {
        console.log(`未找到精确匹配，尝试不区分大小写匹配...`);
        const [username, domain] = email.split('@');
        const regex = new RegExp(`^${username}(\\+.*)?@${domain}$`, 'i');
        foundUsers = await users.find({ email: regex }).toArray();
      }
      
      if (foundUsers.length > 0) {
        console.log(`找到 ${foundUsers.length} 个匹配的用户:`);
        foundUsers.forEach(user => {
          console.log(`  - ${user.username || '未设置用户名'} (${user.email})`);
        });
        
        // 删除用户
        const result = await users.deleteMany({ email: { $in: foundUsers.map(u => u.email) } });
        console.log(`已删除 ${result.deletedCount} 个用户`);
      } else {
        console.log(`未找到匹配 ${email} 的用户`);
      }
    }
  } catch (err) {
    console.error('操作错误:', err);
  } finally {
    if (client) {
      await client.close().catch(() => {}); // 忽略关闭连接时的错误
      console.log('数据库连接已关闭');
    }
  }
}

// 执行主函数
main().catch(console.error); 