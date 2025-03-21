// MongoDB初始化脚本
// 创建数据库、集合和初始管理员用户

// 切换到用户服务数据库
db = db.getSiblingDB('user-service');

// 创建用户集合（如果不存在）
if (!db.getCollectionNames().includes('users')) {
  db.createCollection('users');
  print('已创建users集合');
}

// 创建用户名和邮箱的唯一索引
db.users.createIndex({ "username": 1 }, { unique: true });
db.users.createIndex({ "email": 1 }, { unique: true });
print('已创建用户名和邮箱的唯一索引');

// 检查是否已存在管理员用户
const adminExists = db.users.findOne({ role: 'superadmin' });

if (!adminExists) {
  // 创建一个默认的超级管理员用户
  // 注意：在生产环境中应该更改这些默认值
  db.users.insertOne({
    username: 'admin',
    email: 'admin@example.com',
    // 默认密码: 'Admin@123'（在实际应用中会通过bcrypt加密）
    // 这里使用预先生成的bcrypt哈希作为示例
    password: '$2a$10$IhIXKXY./iM1h0yCEgYM.eTVQeKxAMVBjGvYxkZ0O0xH5GNGPvGf2',
    role: 'superadmin',
    isVerified: true,
    createdAt: new Date(),
    updatedAt: new Date()
  });
  print('已创建默认管理员用户: admin@example.com / Admin@123');
}

print('MongoDB初始化完成！'); 