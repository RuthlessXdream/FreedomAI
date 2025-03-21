# API 参考文档

FreedomAI 用户服务 API 提供完整的身份验证、用户管理和多因素认证功能。

## 基础信息

- **基础URL**: `/api/auth`
- **数据格式**: 所有请求和响应均使用 JSON 格式
- **认证**: 大多数端点需要在请求头中包含 JWT 访问令牌
  ```
  Authorization: Bearer {access_token}
  ```
- **通用响应格式**:
  ```json
  {
    "success": true|false,
    "message": "操作结果描述",
    "data": { /* 返回数据 */ }
  }
  ```

## 身份验证 API

### 用户注册

注册新用户账户。

- **URL**: `/api/auth/register`
- **方法**: `POST`
- **认证**: 不需要
- **请求体**:
  ```json
  {
    "username": "用户名",
    "email": "user@example.com",
    "password": "安全密码",
    "fullName": "用户全名" 
  }
  ```
- **成功响应** (201 Created):
  ```json
  {
    "success": true,
    "message": "用户注册成功，请验证您的邮箱",
    "data": {
      "userId": "用户ID",
      "username": "用户名",
      "email": "user@example.com",
      "emailVerified": false
    }
  }
  ```
- **错误响应**:
  - 400 Bad Request: 请求数据无效
  - 409 Conflict: 邮箱或用户名已被注册

### 用户登录

使用邮箱和密码登录。

- **URL**: `/api/auth/login`
- **方法**: `POST`
- **认证**: 不需要
- **请求体**:
  ```json
  {
    "email": "user@example.com",
    "password": "密码"
  }
  ```
- **成功响应** (200 OK):
  ```json
  {
    "success": true,
    "message": "登录成功",
    "data": {
      "accessToken": "JWT_访问令牌",
      "refreshToken": "刷新令牌",
      "user": {
        "userId": "用户ID",
        "username": "用户名",
        "email": "user@example.com",
        "mfaEnabled": false
      }
    }
  }
  ```
- **MFA启用时的响应** (200 OK):
  ```json
  {
    "success": true,
    "message": "需要MFA验证",
    "data": {
      "requireMFA": true,
      "tempToken": "临时令牌"
    }
  }
  ```
- **错误响应**:
  - 400 Bad Request: 请求数据无效
  - 401 Unauthorized: 凭据错误
  - 403 Forbidden: 账户已锁定或邮箱未验证

### MFA验证

提交MFA验证码。

- **URL**: `/api/auth/verify-mfa`
- **方法**: `POST`
- **认证**: 临时令牌
- **请求头**:
  ```
  Authorization: Bearer {tempToken}
  ```
- **请求体**:
  ```json
  {
    "mfaCode": "123456"
  }
  ```
- **成功响应** (200 OK):
  ```json
  {
    "success": true,
    "message": "MFA验证成功",
    "data": {
      "accessToken": "JWT_访问令牌",
      "refreshToken": "刷新令牌",
      "user": {
        "userId": "用户ID",
        "username": "用户名",
        "email": "user@example.com",
        "mfaEnabled": true
      }
    }
  }
  ```
- **错误响应**:
  - 400 Bad Request: 验证码格式错误
  - 401 Unauthorized: 临时令牌无效或验证码错误

### 刷新令牌

使用刷新令牌获取新的访问令牌。

- **URL**: `/api/auth/refresh-token`
- **方法**: `POST`
- **认证**: 不需要
- **请求体**:
  ```json
  {
    "refreshToken": "刷新令牌"
  }
  ```
- **成功响应** (200 OK):
  ```json
  {
    "success": true,
    "message": "令牌刷新成功",
    "data": {
      "accessToken": "新的访问令牌",
      "refreshToken": "新的刷新令牌"
    }
  }
  ```
- **错误响应**:
  - 400 Bad Request: 刷新令牌未提供
  - 401 Unauthorized: 刷新令牌无效或过期

### 用户注销

注销用户会话并使当前刷新令牌失效。

- **URL**: `/api/auth/logout`
- **方法**: `POST`
- **认证**: 需要
- **请求头**:
  ```
  Authorization: Bearer {accessToken}
  ```
- **请求体**:
  ```json
  {
    "refreshToken": "当前刷新令牌"
  }
  ```
- **成功响应** (200 OK):
  ```json
  {
    "success": true,
    "message": "注销成功"
  }
  ```
- **错误响应**:
  - 400 Bad Request: 刷新令牌未提供
  - 401 Unauthorized: 访问令牌无效

## 邮箱验证 API

### 发送验证邮件

发送包含验证链接的邮件。

- **URL**: `/api/auth/send-verification-email`
- **方法**: `POST`
- **认证**: 需要
- **请求头**:
  ```
  Authorization: Bearer {accessToken}
  ```
- **成功响应** (200 OK):
  ```json
  {
    "success": true,
    "message": "验证邮件已发送"
  }
  ```
- **错误响应**:
  - 401 Unauthorized: 访问令牌无效
  - 400 Bad Request: 邮箱已验证
  - 429 Too Many Requests: 短时间内请求过多

### 验证邮箱

验证用户邮箱。

- **URL**: `/api/auth/verify-email`
- **方法**: `POST`
- **认证**: 不需要
- **请求体**:
  ```json
  {
    "token": "验证令牌"
  }
  ```
- **成功响应** (200 OK):
  ```json
  {
    "success": true,
    "message": "邮箱验证成功"
  }
  ```
- **错误响应**:
  - 400 Bad Request: 令牌无效或已过期
  - 409 Conflict: 邮箱已验证

## 密码管理 API

### 请求密码重置

发送密码重置邮件。

- **URL**: `/api/auth/password-reset-request`
- **方法**: `POST`
- **认证**: 不需要
- **请求体**:
  ```json
  {
    "email": "user@example.com"
  }
  ```
- **成功响应** (200 OK):
  ```json
  {
    "success": true,
    "message": "如果邮箱存在，重置链接已发送"
  }
  ```
- **错误响应**:
  - 429 Too Many Requests: 短时间内请求过多

### 重置密码

使用重置令牌设置新密码。

- **URL**: `/api/auth/password-reset`
- **方法**: `POST`
- **认证**: 不需要
- **请求体**:
  ```json
  {
    "token": "重置令牌",
    "newPassword": "新密码"
  }
  ```
- **成功响应** (200 OK):
  ```json
  {
    "success": true,
    "message": "密码重置成功"
  }
  ```
- **错误响应**:
  - 400 Bad Request: 令牌无效或已过期
  - 400 Bad Request: 密码强度不足

### 修改密码

已登录用户修改密码。

- **URL**: `/api/auth/change-password`
- **方法**: `POST`
- **认证**: 需要
- **请求头**:
  ```
  Authorization: Bearer {accessToken}
  ```
- **请求体**:
  ```json
  {
    "currentPassword": "当前密码",
    "newPassword": "新密码"
  }
  ```
- **成功响应** (200 OK):
  ```json
  {
    "success": true,
    "message": "密码修改成功"
  }
  ```
- **错误响应**:
  - 401 Unauthorized: 当前密码错误
  - 400 Bad Request: 新密码强度不足

## MFA管理 API

### 获取MFA设置状态

获取用户MFA状态。

- **URL**: `/api/auth/mfa-status`
- **方法**: `GET`
- **认证**: 需要
- **请求头**:
  ```
  Authorization: Bearer {accessToken}
  ```
- **成功响应** (200 OK):
  ```json
  {
    "success": true,
    "data": {
      "mfaEnabled": true|false
    }
  }
  ```

### 生成MFA设置码

生成MFA设置QR码。

- **URL**: `/api/auth/generate-mfa-setup`
- **方法**: `GET`
- **认证**: 需要
- **请求头**:
  ```
  Authorization: Bearer {accessToken}
  ```
- **成功响应** (200 OK):
  ```json
  {
    "success": true,
    "data": {
      "secret": "MFA密钥",
      "qrCodeUrl": "QR码URL"
    }
  }
  ```
- **错误响应**:
  - 400 Bad Request: MFA已启用

### 启用/禁用MFA

切换MFA状态。

- **URL**: `/api/auth/toggle-mfa`
- **方法**: `POST`
- **认证**: 需要
- **请求头**:
  ```
  Authorization: Bearer {accessToken}
  ```
- **请求体** (启用MFA):
  ```json
  {
    "secret": "MFA密钥",
    "mfaCode": "123456",
    "enable": true
  }
  ```
- **请求体** (禁用MFA):
  ```json
  {
    "mfaCode": "123456",
    "enable": false
  }
  ```
- **成功响应** (200 OK):
  ```json
  {
    "success": true,
    "message": "MFA已启用|已禁用"
  }
  ```
- **错误响应**:
  - 400 Bad Request: 验证码错误
  - 400 Bad Request: 缺少参数

## 用户管理 API

### 获取当前用户信息

获取当前登录用户详细信息。

- **URL**: `/api/users/me`
- **方法**: `GET`
- **认证**: 需要
- **请求头**:
  ```
  Authorization: Bearer {accessToken}
  ```
- **成功响应** (200 OK):
  ```json
  {
    "success": true,
    "data": {
      "userId": "用户ID",
      "username": "用户名",
      "email": "user@example.com",
      "fullName": "用户全名",
      "emailVerified": true,
      "mfaEnabled": true|false,
      "createdAt": "2023-01-01T00:00:00.000Z",
      "updatedAt": "2023-01-01T00:00:00.000Z"
    }
  }
  ```

### 更新用户信息

更新当前用户的个人资料。

- **URL**: `/api/users/update-profile`
- **方法**: `PATCH`
- **认证**: 需要
- **请求头**:
  ```
  Authorization: Bearer {accessToken}
  ```
- **请求体**:
  ```json
  {
    "username": "新用户名",
    "fullName": "新全名"
  }
  ```
- **成功响应** (200 OK):
  ```json
  {
    "success": true,
    "message": "个人资料更新成功",
    "data": {
      "username": "新用户名",
      "fullName": "新全名"
    }
  }
  ```
- **错误响应**:
  - 400 Bad Request: 数据验证失败
  - 409 Conflict: 用户名已被占用

## 管理员 API

### 获取所有用户

获取系统中所有用户的列表 (仅管理员)。

- **URL**: `/api/admin/users`
- **方法**: `GET`
- **认证**: 需要 (管理员)
- **请求头**:
  ```
  Authorization: Bearer {accessToken}
  ```
- **查询参数**:
  - `page`: 页码 (默认: 1)
  - `limit`: 每页记录数 (默认: 20)
- **成功响应** (200 OK):
  ```json
  {
    "success": true,
    "data": {
      "users": [
        {
          "userId": "用户ID",
          "username": "用户名",
          "email": "user@example.com",
          "fullName": "用户全名",
          "emailVerified": true,
          "mfaEnabled": true,
          "createdAt": "2023-01-01T00:00:00.000Z"
        }
      ],
      "pagination": {
        "totalUsers": 100,
        "totalPages": 5,
        "currentPage": 1,
        "limit": 20
      }
    }
  }
  ```
- **错误响应**:
  - 403 Forbidden: 权限不足

### 删除用户

删除指定用户 (仅管理员)。

- **URL**: `/api/admin/users/:userId`
- **方法**: `DELETE`
- **认证**: 需要 (管理员)
- **请求头**:
  ```
  Authorization: Bearer {accessToken}
  ```
- **URL参数**:
  - `userId`: 要删除的用户ID
- **成功响应** (200 OK):
  ```json
  {
    "success": true,
    "message": "用户删除成功"
  }
  ```
- **错误响应**:
  - 403 Forbidden: 权限不足
  - 404 Not Found: 用户不存在 