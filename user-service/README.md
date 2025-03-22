# FREEDOM AI 用户认证系统

FREEDOM AI 用户认证系统是一个全功能的用户认证和授权服务，提供用户注册、登录、令牌刷新、MFA认证等功能。

## 功能特性

- 用户注册与邮箱验证
- 用户登录与JWT令牌认证
- 刷新令牌机制（支持长时间会话）
- 多因素认证 (MFA)
- 密码重置流程
- 用户信息管理
- 账户锁定（防止暴力破解）
- 权限管理与RBAC

## 技术栈

- **后端框架**: Node.js + Express
- **数据库**: MongoDB + Mongoose
- **认证**: JWT (JSON Web Tokens)
- **邮件服务**: Nodemailer
- **安全**: bcryptjs, helmet, 速率限制
- **日志**: Winston

## 安装与运行

### 前置条件

- Node.js (v14+)
- MongoDB (v4+)
- npm 或 yarn

### 安装步骤

1. 克隆仓库
   ```bash
   git clone https://github.com/your-org/freedom-ai-user-service.git
   cd freedom-ai-user-service
   ```

2. 安装依赖
   ```bash
   npm install
   # 或
   yarn install
   ```

3. 配置环境变量
   ```bash
   cp .env.example .env
   # 然后编辑.env文件设置你的环境变量
   ```

4. 启动服务
   ```bash
   npm start
   # 或开发模式
   npm run dev
   ```

## 系统配置

系统配置主要分为两部分：环境变量配置和SMTP邮件配置。

### 配置管理

我们提供了便捷的配置管理工具，可以通过以下命令管理配置：

```bash
# 查看所有配置
npm run config:list

# 查看特定配置
npm run config:get JWT_SECRET

# 修改配置
npm run config:set PORT 3003
```

### 环境变量配置 (.env)

主要配置参数：

#### 服务器配置
- `NODE_ENV`: 运行环境 (development/production)
- `PORT`: 服务器端口
- `HOST`: 服务器主机名

#### 数据库配置
- `MONGODB_URI`: MongoDB连接URI
- `MONGODB_TEST_URI`: 测试用MongoDB连接URI

#### JWT配置
- `JWT_SECRET`: JWT加密密钥
- `JWT_EXPIRES_IN`: JWT有效期
- `JWT_REFRESH_SECRET`: 刷新令牌密钥
- `JWT_REFRESH_EXPIRES_IN`: 刷新令牌有效期

#### 邮件服务配置
- `MAIL_HOST`: SMTP服务器地址
- `MAIL_PORT`: SMTP服务器端口
- `MAIL_USER`: SMTP用户名
- `MAIL_PASSWORD`: SMTP密码
- `MAIL_FROM`: 发件人地址

### SMTP邮件配置 (config/smtp.config.js)

这个文件包含邮件服务的详细配置，包括：

- SMTP服务器设置
- 邮件模板（验证邮件、密码重置、MFA验证等）
- 发件人信息

## API接口

### 认证相关

- `POST /api/auth/register` - 用户注册
- `POST /api/auth/verify-email` - 验证邮箱
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/verify-mfa` - 验证MFA
- `POST /api/auth/refresh-token` - 刷新访问令牌
- `POST /api/auth/logout` - 用户注销
- `POST /api/auth/password-reset` - 请求密码重置
- `POST /api/auth/password-reset/verify` - 验证密码重置
- `POST /api/auth/toggle-mfa` - 开启/关闭MFA

### 用户相关

- `GET /api/users/profile` - 获取用户信息
- `PUT /api/users/profile` - 更新用户信息
- `GET /api/users` - 获取用户列表 (仅管理员)
- `GET /api/users/:id` - 获取特定用户 (仅管理员)
- `DELETE /api/users/:id` - 删除用户 (仅管理员)

## 测试

系统提供了多种测试脚本：

```bash
# 运行所有测试
npm test

# 测试刷新令牌功能
npm run test:refresh

# 综合功能测试
npm run test:comprehensive

# 为测试用户注册账号
npm run register your-email@example.com

# 验证测试用户邮箱
npm run verify your-email@example.com verification-code
```

## 安全注意事项

- 生产环境下请使用强密钥
- 定期更换JWT密钥
- 使用HTTPS保护API通信
- 避免在代码库中存储敏感信息

## 许可证

MIT
