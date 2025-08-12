-- 创建爬虫数据库
CREATE DATABASE IF NOT EXISTS spider_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 使用数据库
USE spider_db;

-- 创建用户表
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'user', 'viewer') DEFAULT 'user',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_email (email),
    INDEX idx_role (role)
);

-- 创建爬虫任务表
CREATE TABLE IF NOT EXISTS tasks (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    user_id INT NOT NULL,
    config_id INT,
    status ENUM('pending', 'running', 'completed', 'failed', 'cancelled') DEFAULT 'pending',
    priority INT DEFAULT 5,
    scheduled_at TIMESTAMP NULL,
    started_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    progress DECIMAL(5,2) DEFAULT 0.00,
    pages_crawled INT DEFAULT 0,
    pages_total INT DEFAULT 0,
    data_extracted INT DEFAULT 0,
    error_count INT DEFAULT 0,
    retry_count INT DEFAULT 0,
    max_retries INT DEFAULT 3,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_priority (priority),
    INDEX idx_scheduled_at (scheduled_at),
    INDEX idx_created_at (created_at)
);

-- 创建爬虫配置表
CREATE TABLE IF NOT EXISTS crawl_configs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    user_id INT NOT NULL,
    target_url VARCHAR(500) NOT NULL,
    crawl_type ENUM('web', 'api', 'hybrid') DEFAULT 'web',
    max_pages INT DEFAULT 100,
    max_depth INT DEFAULT 3,
    delay_min INT DEFAULT 1000,
    delay_max INT DEFAULT 3000,
    concurrent_limit INT DEFAULT 5,
    user_agent TEXT,
    headers JSON,
    cookies JSON,
    proxy_config JSON,
    selectors JSON,
    filters JSON,
    output_format ENUM('json', 'csv', 'xml') DEFAULT 'json',
    storage_config JSON,
    media_download BOOLEAN DEFAULT FALSE,
    media_config JSON,
    anti_bot_config JSON,
    is_template BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_crawl_type (crawl_type),
    INDEX idx_is_template (is_template),
    INDEX idx_is_active (is_active)
);

-- 添加外键约束
ALTER TABLE tasks ADD CONSTRAINT fk_tasks_config_id 
    FOREIGN KEY (config_id) REFERENCES crawl_configs(id) ON DELETE SET NULL;

-- 创建任务执行日志表
CREATE TABLE IF NOT EXISTS task_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    task_id INT NOT NULL,
    level ENUM('debug', 'info', 'warn', 'error') DEFAULT 'info',
    message TEXT NOT NULL,
    details JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    INDEX idx_task_id (task_id),
    INDEX idx_level (level),
    INDEX idx_created_at (created_at)
);

-- 创建系统配置表
CREATE TABLE IF NOT EXISTS system_configs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value JSON NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_config_key (config_key),
    INDEX idx_is_active (is_active)
);

-- 创建API密钥表
CREATE TABLE IF NOT EXISTS api_keys (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    key_name VARCHAR(100) NOT NULL,
    api_key VARCHAR(255) UNIQUE NOT NULL,
    permissions JSON,
    expires_at TIMESTAMP NULL,
    last_used_at TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_api_key (api_key),
    INDEX idx_is_active (is_active),
    INDEX idx_expires_at (expires_at)
);

-- 插入默认管理员用户
INSERT INTO users (username, email, password_hash, role) VALUES 
('admin', 'admin@spider.com', '$2b$10$rQZ8kHWKtGY5uKJ4vJ4vKOYxJ4vJ4vKOYxJ4vJ4vKOYxJ4vJ4vKOYx', 'admin');

-- 插入默认系统配置
INSERT INTO system_configs (config_key, config_value, description) VALUES 
('crawler.default_user_agent', '"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"', '默认用户代理'),
('crawler.max_concurrent_tasks', '10', '最大并发任务数'),
('crawler.default_delay', '2000', '默认请求延迟(毫秒)'),
('storage.default_format', '"json"', '默认存储格式'),
('media.max_file_size', '52428800', '媒体文件最大大小(50MB)'),
('security.session_timeout', '3600', '会话超时时间(秒)');