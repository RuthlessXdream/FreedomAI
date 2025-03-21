FROM node:18-alpine

WORKDIR /usr/src/app

# 复制package.json和package-lock.json
COPY package*.json ./

# 安装依赖
RUN npm install

# 复制源代码
COPY . .

# 暴露端口
EXPOSE 3001

# 启动服务
CMD ["npm", "start"] 