## 审计日志系统

FreedomAI用户服务包括完整的审计日志系统，用于记录和监控用户操作和系统活动。

### 主要功能

- **完整的操作记录**：记录所有用户登录、注册、修改个人信息等操作
- **详细的日志信息**：包括操作时间、用户ID、IP地址、用户代理等信息
- **用户操作历史**：支持按用户ID查询操作历史
- **数据导出**：支持将审计日志导出为CSV格式
- **权限控制**：只有管理员可以访问审计日志

### API端点

| 端点 | 方法 | 描述 | 需要权限 |
|------|------|------|---------|
| `/api/audit-logs` | GET | 获取审计日志列表 | 管理员 |
| `/api/audit-logs/:id` | GET | 获取特定日志详情 | 管理员 |
| `/api/audit-logs/user/:userId` | GET | 获取指定用户的操作历史 | 管理员 |
| `/api/audit-logs/summary` | GET | 获取审计日志摘要统计 | 管理员 |
| `/api/audit-logs/export` | GET | 导出审计日志为CSV文件 | 管理员 |

### 测试

项目包含完整的测试套件，用于验证审计日志系统的功能和性能：

1. **功能测试**：验证所有API端点的功能和权限控制
   ```bash
   # 初始化测试环境
   ./tools/setup/setup-test-env.sh
   
   # 运行功能测试
   node tests/audit/real-test.js
   ```

2. **性能测试**：测试系统在高负载下的表现
   ```bash
   # 运行性能测试
   node tests/audit/performance-test-real.js
   ```

性能测试结果将保存在 `tests/audit/output/` 目录下。 