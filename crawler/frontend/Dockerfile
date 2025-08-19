# 使用官方 Node.js 18 镜像作为基础镜像
FROM node:18-alpine AS base

# 设置工作目录
WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm

# 复制共享类型定义（必须在安装依赖之前）
COPY ../shared ../shared

# 复制 package.json 和 pnpm-lock.yaml
COPY ./frontend/package.json ./frontend/pnpm-lock.yaml ./

# 安装所有依赖（包括开发依赖，构建时需要）
RUN pnpm install --frozen-lockfile

# 复制源代码
COPY ./frontend .

# 构建应用
RUN pnpm run build

# 生产阶段 - 使用 nginx 提供静态文件服务
FROM nginx:alpine AS production

# 复制构建产物到 nginx 目录
COPY --from=base /app/dist /usr/share/nginx/html

# nginx 配置文件将通过 docker-compose volumes 挂载

# 暴露端口
EXPOSE 80

# 启动 nginx
CMD ["nginx", "-g", "daemon off;"]