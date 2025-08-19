# 使用官方 Node.js 20 镜像作为基础镜像
FROM node:20-alpine AS base

# 设置工作目录
WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm

# 复制共享类型定义（必须在安装依赖之前）
COPY shared ../shared

# 复制 package.json 和 pnpm-lock.yaml
COPY backend/package.json backend/pnpm-lock.yaml ./

# 安装依赖
RUN pnpm install --frozen-lockfile

# 复制源代码
COPY backend .

# 构建应用
RUN pnpm run build

# 生产阶段
FROM node:20-alpine AS production

# 设置工作目录
WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm

# 复制 package.json 和 pnpm-lock.yaml
COPY backend/package.json backend/pnpm-lock.yaml ./

# 只安装生产依赖
RUN pnpm install --frozen-lockfile --prod

# 从构建阶段复制构建产物和node_modules
COPY --from=base /app/dist ./dist
COPY --from=base /app/node_modules ./node_modules

# 暴露端口
EXPOSE 3000

# 启动应用
CMD ["node", "dist/src/main.js"]