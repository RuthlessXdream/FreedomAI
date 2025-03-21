#!/bin/bash

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # 恢复默认颜色

echo -e "${GREEN}====================================${NC}"
echo -e "${GREEN}  FreedomAI 用户服务 - 开发环境启动  ${NC}"
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

# 检查依赖是否安装
echo -e "${GREEN}检查依赖...${NC}"
if [ ! -d "../node_modules" ]; then
  echo -e "${YELLOW}未找到node_modules，正在安装依赖...${NC}"
  cd .. && npm install
  if [ $? -ne 0 ]; then
    echo -e "${RED}依赖安装失败，请手动运行npm install${NC}"
    exit 1
  fi
  echo -e "${GREEN}依赖安装成功${NC}"
else
  echo -e "${GREEN}依赖已安装${NC}"
fi

# 检查MongoDB连接
echo -e "${GREEN}检查MongoDB连接...${NC}"
MONGO_URI=$(grep MONGO_URI ../.env | cut -d '=' -f2-)

if [ -z "$MONGO_URI" ]; then
  echo -e "${YELLOW}警告: .env文件中未找到MONGO_URI${NC}"
  echo -e "${YELLOW}请确保MongoDB服务已运行并配置了正确的连接URI${NC}"
else
  echo -e "${GREEN}MongoDB URI已配置${NC}"
fi

# 检查JWT密钥
JWT_SECRET=$(grep JWT_SECRET ../.env | cut -d '=' -f2-)
if [ -z "$JWT_SECRET" ]; then
  echo -e "${YELLOW}警告: JWT_SECRET未配置，将生成随机密钥${NC}"
  RANDOM_SECRET=$(openssl rand -base64 32)
  sed -i "s/JWT_SECRET=/JWT_SECRET=$RANDOM_SECRET/" ../.env
  echo -e "${GREEN}已生成随机JWT密钥${NC}"
else
  echo -e "${GREEN}JWT密钥已配置${NC}"
fi

# 检查刷新令牌密钥
JWT_REFRESH_SECRET=$(grep JWT_REFRESH_SECRET ../.env | cut -d '=' -f2-)
if [ -z "$JWT_REFRESH_SECRET" ]; then
  echo -e "${YELLOW}警告: JWT_REFRESH_SECRET未配置，将生成随机密钥${NC}"
  RANDOM_REFRESH_SECRET=$(openssl rand -base64 32)
  sed -i "s/JWT_REFRESH_SECRET=/JWT_REFRESH_SECRET=$RANDOM_REFRESH_SECRET/" ../.env
  echo -e "${GREEN}已生成随机刷新令牌密钥${NC}"
else
  echo -e "${GREEN}刷新令牌密钥已配置${NC}"
fi

# 启动开发服务器
echo -e "${GREEN}启动开发服务器...${NC}"
echo -e "${YELLOW}按Ctrl+C停止服务${NC}"
echo -e "${GREEN}====================================${NC}"

cd .. && npm run dev 