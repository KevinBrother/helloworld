FROM mcr.microsoft.com/playwright:v1.54.2-jammy

# 设置工作目录
WORKDIR /app

# 复制共享类型定义（必须在安装依赖之前）
COPY ../shared ../shared

# 复制 package.json 和 pnpm-lock.yaml
COPY ./backend/package.json ./backend/pnpm-lock.yaml ./

# 安装 pnpm
RUN npm install -g pnpm

# 安装依赖
RUN pnpm install

# 复制源代码
COPY ./backend .

# 构建应用
RUN pnpm run build

# 暴露端口
EXPOSE 3000

# 启动应用
CMD ["pnpm", "run", "start:prod"]