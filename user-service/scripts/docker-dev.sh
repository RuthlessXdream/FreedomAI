#!/bin/bash

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # 恢复默认颜色

echo -e "${GREEN}====================================${NC}"
echo -e "${GREEN}  FreedomAI 用户服务 - Docker开发环境  ${NC}"
echo -e "${GREEN}====================================${NC}"

# 检查.env文件
if [ ! -f ../.env ]; then
  echo -e "${YELLOW}警告: 未找到.env文件，将从示例创建${NC}"
  if [ -f ../.env.example ]; then
    cp ../.env.example ../.env
    echo -e "${GREEN}已创建.env文件，请根据需要修改配置${NC}"
  else
    echo -e "${RED}错误: .env.example文件不存在，无法创建配置${NC}"
    exit 1
  fi
fi

# 检查Docker是否安装
if ! command -v docker &> /dev/null; then
  echo -e "${RED}错误: Docker未安装，请先安装Docker${NC}"
  exit 1
fi

if ! command -v docker-compose &> /dev/null; then
  echo -e "${RED}错误: Docker Compose未安装，请先安装Docker Compose${NC}"
  exit 1
fi

# 检查Docker服务是否运行
if ! docker info &> /dev/null; then
  echo -e "${RED}错误: Docker服务未运行，请先启动Docker服务${NC}"
  exit 1
fi

# 构建并启动Docker容器
echo -e "${GREEN}构建并启动Docker容器...${NC}"
cd .. && docker-compose up -d

if [ $? -ne 0 ]; then
  echo -e "${RED}Docker容器启动失败，请检查错误信息${NC}"
  exit 1
fi

echo -e "${GREEN}Docker容器启动成功${NC}"
echo -e "${GREEN}====================================${NC}"
echo -e "${YELLOW}服务信息:${NC}"
echo -e "${GREEN}- API服务: http://localhost:3000${NC}"
echo -e "${GREEN}- MongoDB: localhost:27017${NC}"
echo -e "${GREEN}====================================${NC}"
echo -e "${YELLOW}常用命令:${NC}"
echo -e "${GREEN}- 查看日志: docker-compose logs -f${NC}"
echo -e "${GREEN}- 停止服务: docker-compose down${NC}"
echo -e "${GREEN}- 重启服务: docker-compose restart${NC}"
echo -e "${GREEN}====================================${NC}"

# 打印容器状态
echo -e "${GREEN}容器状态:${NC}"
cd .. && docker-compose ps 