# FREEDOM AI 平台

FREEDOM AI是一个全功能的人工智能服务平台，采用微服务架构设计，提供用户认证、内容管理、AI模型服务等多种功能。

## 项目结构

本仓库包含以下主要服务:

```
FreedomAI/
├── user-service/           # 用户认证与授权服务
├── client/                 # 前端应用
└── shared/                 # 共享库和工具
```

## 服务说明

### 用户服务 (user-service)

用户认证系统提供完整的用户管理功能，包括：

- 用户注册与邮箱验证
- 用户登录与JWT令牌认证
- 刷新令牌机制（支持长时间会话）
- 多因素认证 (MFA)
- 密码重置流程
- 用户信息管理
- 账户锁定（防止暴力破解）
- 权限管理与RBAC
- 完整的审计日志系统（记录用户活动与系统操作）

详细文档请参阅 [用户服务README](./user-service/README.md)

### 客户端 (client)

基于React构建的现代化前端应用，提供:

- 响应式设计
- 主题支持
- 国际化
- 状态管理

### 共享库 (shared)

包含在多个服务中共享的代码和工具：

- 通用工具函数
- 类型定义
- 中间件
- 测试工具

## 开发环境设置

### 前置条件

- Node.js (v14+)
- MongoDB (v4+)
- Docker & Docker Compose (可选)

### 启动所有服务

```bash
# 安装依赖
npm run bootstrap

# 启动所有服务
npm run dev
```

### 单独启动服务

```bash
# 用户服务
cd user-service
./tools/setup/start.sh

# 或者使用测试环境
cd user-service
./tools/setup/setup-test-env.sh

# 客户端
cd client
npm start
```

## 使用Docker

我们提供了Docker配置以便于部署:

```bash
# 构建并启动所有服务
docker-compose up -d

# 仅构建特定服务
docker-compose up -d user-service
```

## 测试

每个服务都有自己的测试套件:

```bash
# 测试所有服务
npm test

# 测试特定服务
cd user-service
npm test
```

## 贡献指南

请参阅[贡献指南](./CONTRIBUTING.md)了解如何为项目做出贡献。

## 许可证

MIT 