/**
 * 测试用户注册、登录和MFA功能
 */
const axios = require('axios');
const dotenv = require('dotenv');
const readline = require('readline');

// 加载环境变量
dotenv.config();

// 创建readline接口用于交互输入
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// 使用Promise包装readline问题
function askQuestion(question) {
  return new Promise(resolve => {
    rl.question(question, answer => {
      resolve(answer);
    });
  });
}

// 配置
const API_BASE_URL = process.env.API_URL || 'http://localhost:3001/api';
const AUTH_BASE_URL = `${API_BASE_URL}/auth`;
const USER_BASE_URL = `${API_BASE_URL}/users`;

console.log(`使用API地址: ${API_BASE_URL}`);

// 生成随机用户信息
const generateRandomUser = () => {
  const timestamp = Date.now();
  return {
    username: `testuser_${timestamp}`,
    email: `test${timestamp}@example.com`,
    password: 'Password123!'
  };
};

// 存储测试中使用的数据
const testData = {
  user: generateRandomUser(),
  tokens: {},
  mfaSecret: '',
  mfaEnabled: false,
  userId: '',
  verificationCode: ''
};

// 1. 测试用户注册
async function testRegister() {
  console.log('\n========== 测试用户注册 ==========');
  console.log(`用户名: ${testData.user.username}`);
  console.log(`邮箱: ${testData.user.email}`);
  console.log(`密码: ${testData.user.password}`);
  
  try {
    console.log(`发送请求到: ${AUTH_BASE_URL}/register`);
    const response = await axios.post(`${AUTH_BASE_URL}/register`, testData.user);
    console.log('✓ 注册成功:', JSON.stringify(response.data, null, 2));
    
    // 保存用户ID和token
    if (response.data.userId) {
      testData.userId = response.data.userId;
    }
    if (response.data.token) {
      testData.tokens.accessToken = response.data.token;
    }
    
    return true;
  } catch (error) {
    console.error('× 注册失败:');
    if (error.response) {
      // 服务器返回了错误响应
      console.error(`  状态码: ${error.response.status}`);
      console.error(`  响应数据: ${JSON.stringify(error.response.data, null, 2)}`);
    } else if (error.request) {
      // 请求已发送，但没有收到响应
      console.error('  未收到服务器响应');
      console.error(error.request);
    } else {
      // 设置请求时发生了错误
      console.error(`  错误消息: ${error.message}`);
    }
    console.error(`  请求配置: ${JSON.stringify(error.config, null, 2)}`);
    return false;
  }
}

// 1.5 手动验证邮箱
async function verifyEmail() {
  console.log('\n========== 邮箱验证 ==========');
  
  try {
    // 由于无法实际收到验证邮件，我们模拟直接从数据库验证
    console.log('由于无法实际收到验证邮件，我们需要手动验证账户');
    
    // 方式一：直接从数据库更新验证状态
    console.log('\n方法一：直接从数据库更新用户状态（需要MongoDB连接）');
    console.log('尝试直接连接到MongoDB更新用户验证状态...');
    
    const { MongoClient } = require('mongodb');
    const uri = 'mongodb://localhost:27018/user-service';
    
    let client = null;
    let dbUpdateSuccess = false;
    
    try {
      client = new MongoClient(uri, { 
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000,
        socketTimeoutMS: 5000
      });
      await client.connect();
      console.log('  ✓ 数据库连接成功');
      
      const db = client.db();
      const users = db.collection('users');
      
      // 找到用户并记录验证码
      const user = await users.findOne({ email: testData.user.email });
      if (user) {
        console.log(`  ✓ 找到用户: ${user.username} (${user.email})`);
        
        if (user.verificationCode) {
          testData.verificationCode = user.verificationCode;
          console.log(`  - 找到验证码: ${testData.verificationCode}`);
        }
        
        // 直接更新用户验证状态
        const updateResult = await users.updateOne(
          { email: testData.user.email },
          { $set: { isVerified: true } }
        );
        
        if (updateResult.modifiedCount > 0) {
          console.log('  ✓ 用户邮箱验证状态已更新');
          dbUpdateSuccess = true;
        } else {
          console.log('  × 用户更新失败');
        }
      } else {
        console.log(`  × 未找到用户: ${testData.user.email}`);
      }
    } catch (dbError) {
      console.error('  × 数据库操作失败:', dbError.message);
    } finally {
      if (client) {
        await client.close().catch(() => {});
      }
    }
    
    // 方式二：使用验证码API验证（如果从数据库获取到了验证码）
    if (!dbUpdateSuccess && testData.verificationCode) {
      console.log('\n方法二：使用验证码API验证');
      const verifyResponse = await axios.post(`${AUTH_BASE_URL}/verify-email`, {
        email: testData.user.email,
        verificationCode: testData.verificationCode
      });
      
      console.log('  ✓ 验证码验证成功:', JSON.stringify(verifyResponse.data, null, 2));
      return true;
    }
    
    // 方式三：询问用户是否要跳过验证
    if (!dbUpdateSuccess && !testData.verificationCode) {
      console.log('\n方法三：手动输入验证码');
      const manualCode = await askQuestion('请输入收到的验证码（如果没有收到，请按Enter跳过）: ');
      
      if (manualCode && manualCode.trim()) {
        const verifyResponse = await axios.post(`${AUTH_BASE_URL}/verify-email`, {
          email: testData.user.email,
          verificationCode: manualCode.trim()
        });
        
        console.log('  ✓ 验证码验证成功:', JSON.stringify(verifyResponse.data, null, 2));
        return true;
      } else {
        const skipVerification = await askQuestion('未能验证邮箱。是否继续测试？(y/n): ');
        if (skipVerification.toLowerCase() === 'y') {
          console.log('继续测试（可能会导致某些测试失败）');
          return true;
        } else {
          console.log('终止测试');
          return false;
        }
      }
    }
    
    return dbUpdateSuccess;
  } catch (error) {
    console.error('× 邮箱验证失败:');
    if (error.response) {
      console.error(`  状态码: ${error.response.status}`);
      console.error(`  响应数据: ${JSON.stringify(error.response.data, null, 2)}`);
    } else if (error.request) {
      console.error('  未收到服务器响应');
      console.error(error.request);
    } else {
      console.error(`  错误消息: ${error.message}`);
    }
    
    // 询问是否继续测试
    const skipVerification = await askQuestion('验证失败。是否继续测试？(y/n): ');
    return skipVerification.toLowerCase() === 'y';
  }
}

// 2. 测试用户登录
async function testLogin() {
  console.log('\n========== 测试用户登录 ==========');
  
  try {
    console.log(`发送请求到: ${AUTH_BASE_URL}/login`);
    console.log(`登录凭据: ${testData.user.email} / ${testData.user.password}`);
    
    const response = await axios.post(`${AUTH_BASE_URL}/login`, {
      email: testData.user.email,
      password: testData.user.password
    });
    
    console.log('✓ 登录成功:', JSON.stringify(response.data, null, 2));
    
    // 保存得到的token
    if (response.data.token) {
      testData.tokens.accessToken = response.data.token;
    }
    if (response.data.refreshToken) {
      testData.tokens.refreshToken = response.data.refreshToken;
    }
    
    return true;
  } catch (error) {
    console.error('× 登录失败:');
    if (error.response) {
      // 服务器返回了错误响应
      console.error(`  状态码: ${error.response.status}`);
      console.error(`  响应数据: ${JSON.stringify(error.response.data, null, 2)}`);
    } else if (error.request) {
      // 请求已发送，但没有收到响应
      console.error('  未收到服务器响应');
      console.error(error.request);
    } else {
      // 设置请求时发生了错误
      console.error(`  错误消息: ${error.message}`);
    }
    return false;
  }
}

// 3. 测试开启MFA
async function testEnableMFA() {
  console.log('\n========== 测试开启MFA ==========');
  
  if (!testData.tokens.accessToken) {
    console.log('× 没有访问令牌，无法启用MFA');
    return false;
  }
  
  try {
    console.log(`发送请求到: ${AUTH_BASE_URL}/toggle-mfa`);
    const config = {
      headers: { Authorization: `Bearer ${testData.tokens.accessToken}` }
    };
    
    console.log(`请求头: ${JSON.stringify(config.headers, null, 2)}`);
    console.log(`请求体: ${JSON.stringify({ enable: true }, null, 2)}`);
    
    const response = await axios.post(`${AUTH_BASE_URL}/toggle-mfa`, { enable: true }, config);
    console.log('✓ MFA配置成功:', JSON.stringify(response.data, null, 2));
    
    if (response.data.mfaSecret) {
      testData.mfaSecret = response.data.mfaSecret;
      testData.mfaEnabled = true;
      
      // 显示MFA设置信息
      console.log('\nMFA已启用!');
      console.log('====================');
      console.log(`密钥: ${testData.mfaSecret}`);
      if (response.data.qrCodeUrl) {
        console.log(`二维码URL: ${response.data.qrCodeUrl}`);
      }
      console.log('====================');
      console.log('请使用Google Authenticator或其他MFA应用扫描二维码或输入密钥。');
      console.log('然后在下一步输入验证码进行验证。');
      
      return true;
    } else {
      console.log('MFA启用成功，但未接收到密钥信息');
      return false;
    }
  } catch (error) {
    console.error('× 启用MFA失败:');
    if (error.response) {
      // 服务器返回了错误响应
      console.error(`  状态码: ${error.response.status}`);
      console.error(`  响应数据: ${JSON.stringify(error.response.data, null, 2)}`);
    } else if (error.request) {
      // 请求已发送，但没有收到响应
      console.error('  未收到服务器响应');
      console.error(error.request);
    } else {
      // 设置请求时发生了错误
      console.error(`  错误消息: ${error.message}`);
    }
    return false;
  }
}

// 4. 测试MFA验证
async function testVerifyMFA() {
  console.log('\n========== 测试MFA验证 ==========');
  
  if (!testData.mfaEnabled) {
    console.log('× MFA未启用，无法验证');
    return false;
  }
  
  try {
    // 请求用户输入验证码
    const mfaCode = await askQuestion('请输入MFA验证码: ');
    
    console.log(`发送请求到: ${AUTH_BASE_URL}/verify-mfa`);
    console.log(`请求体: ${JSON.stringify({ email: testData.user.email, mfaCode }, null, 2)}`);
    
    const response = await axios.post(`${AUTH_BASE_URL}/verify-mfa`, {
      email: testData.user.email,
      mfaCode
    });
    
    console.log('✓ MFA验证成功:', JSON.stringify(response.data, null, 2));
    
    // 更新token
    if (response.data.token) {
      testData.tokens.accessToken = response.data.token;
    }
    
    return true;
  } catch (error) {
    console.error('× MFA验证失败:');
    if (error.response) {
      // 服务器返回了错误响应
      console.error(`  状态码: ${error.response.status}`);
      console.error(`  响应数据: ${JSON.stringify(error.response.data, null, 2)}`);
    } else if (error.request) {
      // 请求已发送，但没有收到响应
      console.error('  未收到服务器响应');
      console.error(error.request);
    } else {
      // 设置请求时发生了错误
      console.error(`  错误消息: ${error.message}`);
    }
    return false;
  }
}

// 5. 测试刷新令牌
async function testRefreshToken() {
  console.log('\n========== 测试刷新令牌 ==========');
  
  if (!testData.tokens.refreshToken) {
    console.log('× 没有可用的刷新令牌');
    return false;
  }
  
  try {
    console.log(`发送请求到: ${AUTH_BASE_URL}/refresh-token`);
    console.log(`请求体: ${JSON.stringify({ refreshToken: testData.tokens.refreshToken }, null, 2)}`);
    
    const response = await axios.post(`${AUTH_BASE_URL}/refresh-token`, {
      refreshToken: testData.tokens.refreshToken
    });
    
    console.log('✓ 令牌刷新成功:', JSON.stringify(response.data, null, 2));
    
    // 更新token
    if (response.data.token) {
      testData.tokens.accessToken = response.data.token;
    }
    if (response.data.refreshToken) {
      testData.tokens.refreshToken = response.data.refreshToken;
    }
    
    return true;
  } catch (error) {
    console.error('× 令牌刷新失败:');
    if (error.response) {
      // 服务器返回了错误响应
      console.error(`  状态码: ${error.response.status}`);
      console.error(`  响应数据: ${JSON.stringify(error.response.data, null, 2)}`);
    } else if (error.request) {
      // 请求已发送，但没有收到响应
      console.error('  未收到服务器响应');
      console.error(error.request);
    } else {
      // 设置请求时发生了错误
      console.error(`  错误消息: ${error.message}`);
    }
    return false;
  }
}

// 6. 测试登出
async function testLogout() {
  console.log('\n========== 测试用户登出 ==========');
  
  if (!testData.tokens.accessToken) {
    console.log('× 没有访问令牌，无法登出');
    return false;
  }
  
  try {
    console.log(`发送请求到: ${AUTH_BASE_URL}/logout`);
    
    const config = {
      headers: { Authorization: `Bearer ${testData.tokens.accessToken}` }
    };
    
    console.log(`请求头: ${JSON.stringify(config.headers, null, 2)}`);
    
    const response = await axios.post(`${AUTH_BASE_URL}/logout`, {}, config);
    console.log('✓ 登出成功:', JSON.stringify(response.data, null, 2));
    return true;
  } catch (error) {
    console.error('× 登出失败:');
    if (error.response) {
      // 服务器返回了错误响应
      console.error(`  状态码: ${error.response.status}`);
      console.error(`  响应数据: ${JSON.stringify(error.response.data, null, 2)}`);
    } else if (error.request) {
      // 请求已发送，但没有收到响应
      console.error('  未收到服务器响应');
      console.error(error.request);
    } else {
      // 设置请求时发生了错误
      console.error(`  错误消息: ${error.message}`);
    }
    return false;
  }
}

// 主函数
async function main() {
  console.log('===================================');
  console.log('  用户认证与MFA功能测试');
  console.log('===================================');
  
  try {
    // 1. 注册新用户
    const registerSuccess = await testRegister();
    console.log(`注册结果: ${registerSuccess ? '成功' : '失败'}`);
    
    if (registerSuccess) {
      // 1.5 验证邮箱
      const verifySuccess = await verifyEmail();
      console.log(`邮箱验证结果: ${verifySuccess ? '成功' : '失败'}`);
      
      if (verifySuccess) {
        // 2. 用户登录
        const loginSuccess = await testLogin();
        console.log(`登录结果: ${loginSuccess ? '成功' : '失败'}`);
        
        if (loginSuccess) {
          // 3. 开启MFA
          const mfaSuccess = await testEnableMFA();
          console.log(`MFA启用结果: ${mfaSuccess ? '成功' : '失败'}`);
          
          if (mfaSuccess) {
            // 4. 验证MFA
            const verifyMfaSuccess = await testVerifyMFA();
            console.log(`MFA验证结果: ${verifyMfaSuccess ? '成功' : '失败'}`);
          }
          
          // 5. 刷新令牌
          const refreshSuccess = await testRefreshToken();
          console.log(`令牌刷新结果: ${refreshSuccess ? '成功' : '失败'}`);
          
          // 6. 用户登出
          const logoutSuccess = await testLogout();
          console.log(`登出结果: ${logoutSuccess ? '成功' : '失败'}`);
        }
      }
    }
    
    console.log('\n===================================');
    console.log('  测试完成!');
    console.log('===================================');
  } catch (error) {
    console.error('测试过程中出现未捕获的错误:');
    console.error(error);
  } finally {
    rl.close();
  }
}

// 执行主函数
console.log('开始执行测试...');
main().catch(err => {
  console.error('运行测试时发生严重错误:');
  console.error(err);
}); 