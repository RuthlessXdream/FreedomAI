# 贡献指南

感谢您对 FreedomAI 项目的关注！我们欢迎各种形式的贡献，无论是代码、文档、Bug 报告还是功能建议。本指南将帮助您了解如何有效地参与到项目开发中。

## 行为准则

- 尊重所有项目参与者
- 接受建设性的批评和反馈
- 关注问题本身，避免个人冲突
- 在技术讨论中保持专业态度

## 如何贡献

### 报告 Bug

发现 Bug 时，请创建一个详细的 Issue，包括：

1. 清晰的标题和描述
2. 重现步骤
3. 预期行为与实际行为
4. 环境信息（操作系统、Node.js 版本等）
5. 如可能，提供截图或日志

### 提交功能建议

提交新功能建议时，请：

1. 检查该功能是否已在 Issue 或 PR 中被提及
2. 详细描述功能的使用场景和价值
3. 如可能，描述实现思路或提供设计文档

### 提交代码

1. **Fork 项目仓库**
2. **克隆您的 Fork**
   ```bash
   git clone https://github.com/YOUR_USERNAME/FreedomAI.git
   cd FreedomAI
   ```

3. **创建功能分支**
   ```bash
   git checkout -b feature/your-feature-name
   ```

4. **开发与测试**
   - 遵循项目的代码风格
   - 编写适当的测试用例
   - 确保所有测试通过
   - 更新相关文档

5. **提交更改**
   ```bash
   git add .
   git commit -m "feat: 添加了新功能X"
   ```
   *注意：我们使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范*

6. **推送到您的仓库**
   ```bash
   git push origin feature/your-feature-name
   ```

7. **创建 Pull Request**
   - 提供清晰的 PR 描述
   - 关联相关 Issue
   - 等待代码审查

## 开发流程

### 分支策略

- `main`: 稳定版本分支
- `dev`: 开发分支，新功能合并到此分支
- `feature/*`: 功能开发分支
- `bugfix/*`: Bug 修复分支
- `release/*`: 发布准备分支

### 提交消息规范

我们使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范格式化提交消息：

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

常见类型：
- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档变更
- `style`: 代码风格变更（不影响代码功能）
- `refactor`: 代码重构
- `perf`: 性能优化
- `test`: 测试相关
- `chore`: 构建过程或辅助工具变更

例如：
```
feat(auth): 添加邮箱验证功能

- 实现了邮箱验证的后端接口
- 添加了邮件模板

Closes #123
```

### 代码风格

- 遵循 ESLint 配置规则
- 使用 2 空格缩进
- 每行代码不超过 100 字符
- 使用有意义的变量和函数名
- 添加必要的注释说明复杂逻辑

### 测试要求

- 所有新功能必须有单元测试
- 修复 Bug 时应添加相应的回归测试
- 测试覆盖率不应下降
- 集成测试应涵盖主要功能流程

## 发布流程

1. 从 `dev` 分支创建 `release/vX.Y.Z` 分支
2. 在 release 分支上进行最终测试和修复
3. 更新版本号和变更日志
4. 合并到 `main` 分支并打标签
5. 合并回 `dev` 分支

## 相关资源

- [项目文档](./docs)
- [API参考](./docs/api)
- [架构设计](./docs/architecture)

---

再次感谢您对 FreedomAI 项目的贡献！如有任何问题，请随时联系项目维护者。 