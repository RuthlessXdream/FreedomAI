# FreedomAI 用户服务

用户认证与授权管理的独立微服务，提供注册、登录、MFA、邮箱验证等功能。

## 目录结构

```
user-service/
├── src/            # 核心源代码
│   ├── controllers/  # 控制器（处理请求逻辑）
│   ├── middlewares/  # 中间件（请求拦截和处理）
│   ├── models/       # 数据模型（MongoDB模型定义）
│   ├── routes/       # 路由定义（API端点）
│   ├── services/     # 服务（业务逻辑）
│   ├── utils/        # 实用工具（辅助函数）
│   ├── app.js        # Express应用配置
│   └── server.js     # 服务器入口
├── config/         # 配置文件
├── public/         # 静态资源
│   ├── images/       # 图片资源
│   ├── css/          # 样式表
│   └── js/           # 客户端脚本
├── scripts/        # 运维脚本
├── tests/          # 测试文件
│   ├── auth/         # 认证测试（注册、登录、注销）
│   ├── email/        # 邮件测试（发送、验证）
│   ├── mfa/          # MFA测试（多因素认证）
│   └── utils/        # 工具测试（数据管理脚本）
├── docs/           # 文档
├── logs/           # 日志文件
└── mongodb-init/   # MongoDB初始化脚本
```

## 功能特性

- 用户认证（注册、登录、注销）
- 多因素认证 (MFA)
- 邮箱验证
- 密码重置
- 访问令牌管理
- 刷新令牌管理
- 用户信息管理

## 开发环境设置

1. 安装依赖:
   ```
   npm install
   ```

2. 配置环境变量:
   - 复制 `.env.example` 到 `.env`
   - 更新配置值

3. 启动开发服务器:
   ```
   npm run dev
   ```

## 测试

### 运行测试

我们提供了多种测试脚本，针对不同功能:

```bash
# 测试认证流程 (注册、验证、登录、MFA)
npm run test:auth

# 测试MFA功能
npm run test:mfa

# 测试邮件功能
npm run test:email
```

### 工具脚本

用于管理和调试的实用脚本:

```bash
# 清理用户数据
npm run utils:cleanup

# 删除指定用户
npm run utils:delete-user
```

## Docker支持

查看 `docs/docker-guide.md` 获取详细的Docker设置指南。

## API 文档

主要端点概览:

- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/logout` - 用户注销
- `POST /api/auth/refresh-token` - 刷新访问令牌
- `POST /api/auth/verify-email` - 验证邮箱
- `POST /api/auth/password-reset` - 请求密码重置
- `POST /api/auth/toggle-mfa` - 启用/禁用MFA

更详细的API文档请参考 `docs/` 目录下的文件。
