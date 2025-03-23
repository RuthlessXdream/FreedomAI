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

if ! command -v curl &> /dev/null; then
  echo -e "${YELLOW}未找到 curl，将使用替代方法检查服务状态${NC}"
  HAS_CURL=false
else
  HAS_CURL=true
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

# 检查服务是否已经在运行
existing_pid=$(lsof -t -i:3002 2>/dev/null)
if [ ! -z "$existing_pid" ]; then
  echo -e "${YELLOW}端口3002已被占用，可能服务已在运行。PID: ${existing_pid}${NC}"
  read -p "是否停止现有服务并重启? (y/n): " stop_existing
  if [ "$stop_existing" = "y" ]; then
    echo -e "${BLUE}停止现有服务...${NC}"
    kill $existing_pid
    sleep 2
  else
    echo -e "${GREEN}保留现有服务运行.${NC}"
    exit 0
  fi
fi

# 启动服务器
echo -e "${BLUE}启动用户服务...${NC}"
echo -e "${YELLOW}服务将在后台运行，输出记录到 logs/server.log${NC}"
NODE_ENV=development node src/server.js > logs/server.log 2>&1 &
SERVER_PID=$!

# 等待服务启动
echo -e "${BLUE}等待服务启动...${NC}"
# 增加等待时间，给服务充分启动的机会
sleep 5

# 循环检查服务是否成功启动
MAX_ATTEMPTS=6
ATTEMPT=1
SERVICE_UP=false

while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
  echo -e "${BLUE}检查服务状态 (尝试 $ATTEMPT/$MAX_ATTEMPTS)...${NC}"
  
  # 首先检查进程是否存在
  if ! ps -p $SERVER_PID > /dev/null; then
    echo -e "${RED}服务进程不存在，启动失败${NC}"
    break
  fi
  
  # 再检查端口是否监听
  if ! netstat -tlnp 2>/dev/null | grep -q ":3002"; then
    echo -e "${YELLOW}服务进程存在但端口3002未监听，等待...${NC}"
    sleep 2
    ATTEMPT=$((ATTEMPT+1))
    continue
  fi
  
  # 最后检查API是否可访问
  if [ "$HAS_CURL" = true ]; then
    HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3002/api/health 2>/dev/null)
    if [ "$HEALTH_CHECK" = "200" ]; then
      SERVICE_UP=true
      break
    else
      echo -e "${YELLOW}服务端口已监听但API尚未就绪 (状态码: $HEALTH_CHECK)，等待...${NC}"
    fi
  else
    # 如果没有curl，只检查到端口监听就认为成功
    SERVICE_UP=true
    break
  fi
  
  sleep 2
  ATTEMPT=$((ATTEMPT+1))
done

# 根据检查结果输出信息
if [ "$SERVICE_UP" = true ]; then
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
  echo -e "${RED}服务启动失败或未能在预期时间内就绪，请检查日志:${NC}"
  echo -e "cat logs/server.log"
fi 