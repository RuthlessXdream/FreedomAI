# Docker 开发与部署指南

本文档提供了使用 Docker 开发和部署 FreedomAI 用户服务的详细指南。

## 前提条件

- 安装 [Docker](https://docs.docker.com/get-docker/)
- 安装 [Docker Compose](https://docs.docker.com/compose/install/)

## 本地开发环境

### 1. 配置环境变量

在项目根目录下复制 `.env.example` 到 `.env` 并更新配置值：

```bash
cp .env.example .env
```

请确保设置了以下必要参数：
- `MONGO_URI`：MongoDB连接字符串
- `JWT_SECRET`：JWT令牌的密钥
- `JWT_REFRESH_SECRET`：刷新令牌的密钥
- `EMAIL_SERVICE`：邮件服务配置
- `MFA_SECRET_KEY`：MFA密钥

### 2. 使用Docker Compose启动服务

```bash
docker-compose up -d
```

这将启动：
- 用户服务 API 服务器（默认端口：3000）
- MongoDB 数据库（默认端口：27017）

### 3. 检查服务状态

```bash
docker-compose ps
```

### 4. 查看日志

```bash
# 查看所有服务的日志
docker-compose logs

# 仅查看用户服务的日志
docker-compose logs user-service

# 实时跟踪日志
docker-compose logs -f
```

### 5. 停止服务

```bash
docker-compose down
```

## 开发工作流程

### 实时代码更新

默认配置下，源代码目录会挂载到容器中，因此您可以在本地编辑代码，变更将自动同步到容器中。容器内运行的是 `nodemon`，它会监视文件变化并自动重启服务器。

### 执行单元测试

```bash
docker-compose exec user-service npm test
```

### 运行特定测试

```bash
# 测试认证流程
docker-compose exec user-service npm run test:auth

# 测试MFA功能
docker-compose exec user-service npm run test:mfa

# 测试邮件功能
docker-compose exec user-service npm run test:email
```

### 访问MongoDB数据库

```bash
docker-compose exec mongodb mongo
```

## 生产环境部署

### 1. 构建生产镜像

```bash
docker build -t freedom-ai/user-service:latest .
```

### 2. 生产环境配置

创建生产环境的 `.env` 文件，确保设置了所有必需的环境变量，并调整以下参数：

- `NODE_ENV=production`
- 设置适当的日志级别
- 配置生产环境的数据库连接

### 3. 使用生产配置运行

```bash
docker-compose -f docker-compose.prod.yml up -d
```

## 容器资源管理

### 资源限制

在 `docker-compose.yml` 或 `docker-compose.prod.yml` 中，可以为服务指定资源限制：

```yaml
services:
  user-service:
    # ...其他配置...
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
```

### 健康检查

```yaml
services:
  user-service:
    # ...其他配置...
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

## 故障排除

### 常见问题

1. **容器无法启动**
   - 检查日志: `docker-compose logs user-service`
   - 验证环境变量是否正确设置
   - 确认端口没有被占用

2. **无法连接到数据库**
   - 确认MongoDB服务正在运行: `docker-compose ps`
   - 验证连接字符串是否正确
   - 检查网络配置

3. **API请求失败**
   - 查看API服务器日志: `docker-compose logs user-service`
   - 确认请求格式正确
   - 验证认证凭据 