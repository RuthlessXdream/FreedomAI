/**
 * 测试密码存储
 */
const axios = require('axios');
const { MongoClient } = require('mongodb');

// API基础URL
const BASE_URL = 'http://localhost:3002';
const API_URL = `${BASE_URL}/api`;
const MONGO_URI = 'mongodb://localhost:27017/user-service';

// 生成测试用户
const generateTestUser = () => {
  const timestamp = Date.now();
  return {
    username: `passwordtest_${timestamp}`,
    email: `passwordtest${timestamp}@example.com`,
    password: 'Password123!'
  };
};

// 1. 直接查询数据库中的用户以查看密码字段
async function checkUserPasswordInDb(email) {
  console.log(`\n===== 检查用户密码 (${email}) =====`);
  
  try {
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    
    const db = client.db();
    
    // 使用原生方法查询，不受Mongoose模型限制
    const user = await db.collection('users').findOne({ email }, { projection: { password: 1 } });
    
    if (user) {
      console.log('用户ID:', user._id);
      console.log('密码字段存在:', !!user.password);
      console.log('密码字段值:', user.password ? user.password.substring(0, 20) + '...' : 'null');
    } else {
      console.log('未找到用户');
    }
    
    await client.close();
    return user;
  } catch (error) {
    console.error('数据库查询错误:', error.message);
    return null;
  }
}

// 2. 在Mongoose模型中显式请求密码字段
async function checkUserWithMongoose(email) {
  console.log(`\n===== 使用Mongoose检查用户 (${email}) =====`);
  
  try {
    // 动态导入以避免模型冲突
    const mongoose = require('mongoose');
    
    // 连接数据库
    await mongoose.connect(MONGO_URI);
    
    // 获取User模型
    const User = mongoose.model('User');
    
    // 查询用户，显式请求密码字段
    const user = await User.findOne({ email }).select('+password');
    
    if (user) {
      console.log('用户ID:', user._id);
      console.log('用户名:', user.username);
      console.log('密码字段存在:', !!user.password);
      console.log('密码字段值:', user.password ? user.password.substring(0, 20) + '...' : 'null');
    } else {
      console.log('未找到用户');
    }
    
    // 断开连接
    await mongoose.disconnect();
    return user;
  } catch (error) {
    console.error('Mongoose查询错误:', error.message);
    return null;
  }
}

// 3. 注册用户并检查密码是否保存
async function testPasswordStorage() {
  try {
    console.log('========================================');
    console.log('        测试密码存储');
    console.log('========================================');
    
    // 生成测试用户
    const testUser = generateTestUser();
    console.log('测试用户:', testUser);
    
    // 注册用户
    console.log('\n===== 注册用户 =====');
    const registerResponse = await axios.post(`${API_URL}/auth/register`, testUser);
    
    console.log('注册响应状态码:', registerResponse.status);
    console.log('注册响应:', registerResponse.data);
    
    if (registerResponse.data.userId) {
      // 检查用户密码存储
      const userId = registerResponse.data.userId;
      console.log('用户ID:', userId);
      
      // 验证邮箱
      await verifyEmailInDb(testUser.email);
      
      // 检查密码
      await checkUserPasswordInDb(testUser.email);
      
      // 尝试登录
      await testLogin(testUser);
      
      // 使用Mongoose检查
      await checkUserWithMongoose(testUser.email);
    } else {
      console.log('注册失败，无法继续测试');
    }
    
    console.log('\n========================================');
    console.log('            测试完成');
    console.log('========================================');
  } catch (error) {
    if (error.response) {
      console.error('API错误:', error.response.status, error.response.data);
    } else {
      console.error('测试错误:', error.message);
    }
  }
}

// 4. 尝试登录
async function testLogin(user) {
  console.log('\n===== 测试登录 =====');
  
  try {
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      email: user.email,
      password: user.password
    });
    
    console.log('登录响应状态码:', loginResponse.status);
    console.log('登录响应:', loginResponse.data);
    console.log('登录成功');
    return true;
  } catch (error) {
    console.error('登录失败:');
    if (error.response) {
      console.error('状态码:', error.response.status);
      console.error('响应数据:', error.response.data);
    } else {
      console.error('错误:', error.message);
    }
    return false;
  }
}

// 5. 验证邮箱
async function verifyEmailInDb(email) {
  console.log('\n===== 验证邮箱 =====');
  
  try {
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    
    const db = client.db();
    const updateResult = await db.collection('users').updateOne(
      { email },
      { $set: { isVerified: true } }
    );
    
    console.log('邮箱验证结果:', updateResult.modifiedCount > 0 ? '成功' : '失败');
    
    await client.close();
    return updateResult.modifiedCount > 0;
  } catch (error) {
    console.error('邮箱验证错误:', error.message);
    return false;
  }
}

// 执行测试
testPasswordStorage().catch(error => {
  console.error('未捕获的错误:', error);
}); 