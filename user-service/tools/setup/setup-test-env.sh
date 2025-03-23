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
echo -e "${BLUE}       FreedomAI 测试环境初始化脚本               ${NC}"
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

# 准备测试目录
echo -e "${BLUE}准备测试目录...${NC}"
mkdir -p tests/audit/output

# 初始化测试数据
echo -e "${BLUE}初始化测试环境...${NC}"
node tests/audit/setup-real-test.js

if [ $? -ne 0 ]; then
  echo -e "${RED}测试环境初始化失败，请检查输出${NC}"
  exit 1
fi

echo -e "${GREEN}==================================================${NC}"
echo -e "${GREEN}     测试环境已成功初始化!                       ${NC}"
echo -e "${GREEN}==================================================${NC}"
echo -e "${BLUE}您现在可以运行以下测试:${NC}"
echo -e "${YELLOW}1. 功能测试:${NC}"
echo -e "   node tests/audit/real-test.js"
echo -e "${YELLOW}2. 性能测试:${NC}"
echo -e "   node tests/audit/performance-test-real.js"
echo -e ""
echo -e "${BLUE}或者启动服务器:${NC}"
echo -e "   ./tools/setup/start.sh"
echo -e "${BLUE}==================================================${NC}" 