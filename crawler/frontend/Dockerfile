# 使用官方 Node.js 18 镜像作为基础镜像
FROM node:18-alpine AS base

# 设置工作目录
WORKDIR /app

# 复制 package.json 和 package-lock.json
COPY package*.json ./

# 安装所有依赖（包括开发依赖，构建时需要）
RUN npm install

# 复制源代码
COPY . .

# 构建应用
RUN npm run build

# 生产阶段 - 使用 nginx 提供静态文件服务
FROM nginx:alpine AS production

# 复制构建产物到 nginx 目录
COPY --from=base /app/dist /usr/share/nginx/html

# nginx 配置文件将通过 docker-compose volumes 挂载

# 暴露端口
EXPOSE 80

# 启动 nginx
CMD ["nginx", "-g", "daemon off;"]