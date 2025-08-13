FROM node:latest

# 设置环境变量
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    procps \
    libxss1 \
    libgconf-2-4 \
    libxrandr2 \
    libasound2 \
    libpangocairo-1.0-0 \
    libatk1.0-0 \
    libcairo-gobject2 \
    libgtk-3-0 \
    libgdk-pixbuf2.0-0 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxi6 \
    libxtst6 \
    libnss3 \
    libcups2 \
    libxrandr2 \
    libasound2 \
    libpangocairo-1.0-0 \
    libatk1.0-0 \
    libcairo-gobject2 \
    libdrm2 \
    libxkbcommon0 \
    libatspi2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# 设置工作目录
WORKDIR /app

# 复制 package.json 和 pnpm-lock.yaml
COPY package.json pnpm-lock.yaml ./

# 安装 pnpm
RUN npm install -g pnpm

# 安装依赖
RUN pnpm install --frozen-lockfile

# 安装 Playwright 浏览器
RUN pnpm exec playwright install --with-deps chromium

# 复制源代码
COPY . .

# 构建应用
RUN pnpm run build

# 暴露端口
EXPOSE 3000

# 启动应用
CMD ["pnpm", "run", "start:prod"]