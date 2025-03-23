#!/bin/bash

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # 无颜色

# 项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$PROJECT_ROOT"

echo -e "${BLUE}==================================================${NC}"
echo -e "${BLUE}          FreedomAI 用户服务启动脚本             ${NC}"
echo -e "${BLUE}==================================================${NC}"

# 检查环境变量文件
if [ ! -f ".env" ]; then
  echo -e "${YELLOW}未找到 .env 文件，将从示例文件复制...${NC}"
  cp .env.example .env
  echo -e "${GREEN}已创建 .env 文件，请根据需要修改配置${NC}"
fi

# 检查依赖
echo -e "${BLUE}检查依赖...${NC}"
if ! command -v node &> /dev/null; then
  echo -e "${RED}未找到 Node.js，请先安装 Node.js${NC}"
  exit 1
fi

if ! command -v npm &> /dev/null; then
  echo -e "${RED}未找到 npm，请先安装 npm${NC}"
  exit 1
fi

# 安装依赖
echo -e "${BLUE}安装依赖...${NC}"
npm install

# 检查MongoDB是否运行
echo -e "${BLUE}检查MongoDB...${NC}"
mongo_running=$(pgrep -x mongod || pgrep -x mongodb || echo "")
if [ -z "$mongo_running" ]; then
  echo -e "${YELLOW}MongoDB 可能未运行，尝试启动...${NC}"
  sudo systemctl start mongod 2>/dev/null || sudo service mongod start 2>/dev/null
  
  if [ $? -ne 0 ]; then
    echo -e "${RED}无法自动启动 MongoDB，请手动启动后再试${NC}"
    echo -e "${YELLOW}您可以尝试运行: sudo systemctl start mongod${NC}"
    exit 1
  fi
  echo -e "${GREEN}MongoDB 已启动${NC}"
else
  echo -e "${GREEN}MongoDB 已运行${NC}"
fi

# 准备日志目录
mkdir -p logs

# 确保测试目录存在
mkdir -p tests/audit/output

# 启动服务器
echo -e "${BLUE}启动用户服务...${NC}"
echo -e "${YELLOW}服务将在后台运行，输出记录到 logs/server.log${NC}"
NODE_ENV=development node src/server.js > logs/server.log 2>&1 &
SERVER_PID=$!

# 等待服务启动
echo -e "${BLUE}等待服务启动...${NC}"
sleep 3

# 检查服务是否成功启动
if ps -p $SERVER_PID > /dev/null; then
  echo -e "${GREEN}==================================================${NC}"
  echo -e "${GREEN}        用户服务已成功启动!                      ${NC}"
  echo -e "${GREEN}==================================================${NC}"
  echo -e "${BLUE}进程ID: ${NC}${SERVER_PID}"
  echo -e "${BLUE}API地址: ${NC}http://localhost:3002"
  echo -e "${BLUE}日志文件: ${NC}${PROJECT_ROOT}/logs/server.log"
  echo -e "${BLUE}管理员账号: ${NC}admin@example.com"
  echo -e "${BLUE}管理员密码: ${NC}Admin@123"
  echo -e "${BLUE}==================================================${NC}"
  echo -e "${YELLOW}使用以下命令查看日志:${NC}"
  echo -e "tail -f logs/server.log"
  echo -e "${YELLOW}使用以下命令停止服务:${NC}"
  echo -e "kill $SERVER_PID"
else
  echo -e "${RED}服务启动失败，请检查日志:${NC}"
  echo -e "cat logs/server.log"
fi 