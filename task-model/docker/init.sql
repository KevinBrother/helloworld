-- 任务模型系统数据库初始化脚本
-- 创建时间: 2024-01-01
-- 版本: 1.0.0

USE task_management;

-- 创建任务表 (tasks)
CREATE TABLE IF NOT EXISTS tasks (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    task_name VARCHAR(255) NOT NULL COMMENT '任务名称',
    task_type VARCHAR(100) NOT NULL COMMENT '任务类型',
    status ENUM('PENDING', 'RUNNING', 'SUCCESS', 'FAILED', 'PAUSED', 'CANCELLED') NOT NULL DEFAULT 'PENDING' COMMENT '任务状态',
    priority INT DEFAULT 0 COMMENT '任务优先级',
    config JSON COMMENT '任务配置参数',
    execution_unit_id VARCHAR(255) COMMENT '执行单元ID',
    execution_unit_type VARCHAR(100) COMMENT '执行单元类型',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    started_at TIMESTAMP NULL COMMENT '开始执行时间',
    completed_at TIMESTAMP NULL COMMENT '完成时间',
    error_message TEXT COMMENT '错误信息',
    retry_count INT DEFAULT 0 COMMENT '重试次数',
    max_retries INT DEFAULT 3 COMMENT '最大重试次数',
    progress DECIMAL(5,2) DEFAULT 0.00 COMMENT '执行进度(0-100)',
    result JSON COMMENT '执行结果',
    INDEX idx_status (status),
    INDEX idx_created_at (created_at),
    INDEX idx_task_type (task_type),
    INDEX idx_execution_unit_id (execution_unit_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='任务表';

-- 创建任务状态历史表 (task_status_history)
CREATE TABLE IF NOT EXISTS task_status_history (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    task_id BIGINT NOT NULL COMMENT '任务ID',
    from_status VARCHAR(50) COMMENT '原状态',
    to_status VARCHAR(50) NOT NULL COMMENT '目标状态',
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '状态变更时间',
    changed_by VARCHAR(255) COMMENT '变更操作者',
    reason TEXT COMMENT '变更原因',
    additional_data JSON COMMENT '附加数据',
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    INDEX idx_task_id (task_id),
    INDEX idx_changed_at (changed_at),
    INDEX idx_to_status (to_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='任务状态历史表';

-- 创建执行单元表 (execution_units)
CREATE TABLE IF NOT EXISTS execution_units (
    id VARCHAR(255) PRIMARY KEY COMMENT '执行单元ID',
    unit_type VARCHAR(100) NOT NULL COMMENT '执行单元类型',
    unit_name VARCHAR(255) NOT NULL COMMENT '执行单元名称',
    status ENUM('AVAILABLE', 'BUSY', 'OFFLINE') NOT NULL DEFAULT 'AVAILABLE' COMMENT '执行单元状态',
    capacity INT DEFAULT 1 COMMENT '执行容量',
    current_load INT DEFAULT 0 COMMENT '当前负载',
    endpoint VARCHAR(500) COMMENT '执行单元端点',
    config JSON COMMENT '执行单元配置',
    last_heartbeat TIMESTAMP COMMENT '最后心跳时间',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    version VARCHAR(50) COMMENT '版本号',
    description TEXT COMMENT '描述信息',
    INDEX idx_status (status),
    INDEX idx_unit_type (unit_type),
    INDEX idx_last_heartbeat (last_heartbeat)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='执行单元表';

-- 创建任务执行日志表 (task_execution_logs)
CREATE TABLE IF NOT EXISTS task_execution_logs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    task_id BIGINT NOT NULL COMMENT '任务ID',
    execution_unit_id VARCHAR(255) COMMENT '执行单元ID',
    log_level ENUM('DEBUG', 'INFO', 'WARN', 'ERROR') NOT NULL DEFAULT 'INFO' COMMENT '日志级别',
    message TEXT NOT NULL COMMENT '日志消息',
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '日志时间',
    metadata JSON COMMENT '元数据',
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (execution_unit_id) REFERENCES execution_units(id) ON DELETE SET NULL,
    INDEX idx_task_id (task_id),
    INDEX idx_timestamp (timestamp),
    INDEX idx_log_level (log_level)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='任务执行日志表';

-- 插入示例执行单元数据
INSERT INTO execution_units (id, unit_type, unit_name, status, capacity, endpoint, config, description) VALUES
('data-processor-1', 'DATA_PROCESSING', '数据处理器1', 'AVAILABLE', 3, 'http://data-processor:8080', 
 JSON_OBJECT('batchSize', 1000, 'timeout', 300), '用于处理CSV和JSON数据文件'),
('video-processor-1', 'VIDEO_PROCESSING', '视频处理器1', 'AVAILABLE', 2, 'http://video-processor:8080', 
 JSON_OBJECT('maxFileSize', '2GB', 'supportedFormats', JSON_ARRAY('mp4', 'avi', 'mov')), '用于视频转码和压缩'),
('db-backup-1', 'DATABASE_BACKUP', '数据库备份器1', 'AVAILABLE', 1, 'http://db-backup:8080', 
 JSON_OBJECT('compressionLevel', 6, 'verifyBackup', true), '用于数据库备份和恢复操作');

-- 插入示例任务数据
INSERT INTO tasks (task_name, task_type, status, priority, config, max_retries) VALUES
('用户数据处理', 'DATA_PROCESSING', 'PENDING', 1, 
 JSON_OBJECT('inputPath', '/data/raw/users.csv', 'outputPath', '/data/processed/users.json', 'batchSize', 1000), 3),
('产品视频压缩', 'VIDEO_PROCESSING', 'PENDING', 2, 
 JSON_OBJECT('inputFile', '/videos/source/product.mp4', 'outputFile', '/videos/output/product_compressed.mp4', 'bitrate', '2000k'), 2),
('每日数据库备份', 'DATABASE_BACKUP', 'PENDING', 0, 
 JSON_OBJECT('dbType', 'mysql', 'database', 'production_db', 'backupType', 'full', 'compression', true), 1);

-- 创建视图：任务概览
CREATE OR REPLACE VIEW task_overview AS
SELECT 
    t.id,
    t.task_name,
    t.task_type,
    t.status,
    t.priority,
    t.progress,
    t.created_at,
    t.started_at,
    t.completed_at,
    t.retry_count,
    t.max_retries,
    eu.unit_name as execution_unit_name,
    eu.status as execution_unit_status,
    TIMESTAMPDIFF(SECOND, t.started_at, COALESCE(t.completed_at, NOW())) as duration_seconds
FROM tasks t
LEFT JOIN execution_units eu ON t.execution_unit_id = eu.id;

-- 创建存储过程：更新任务状态
DELIMITER //
CREATE PROCEDURE UpdateTaskStatus(
    IN p_task_id BIGINT,
    IN p_new_status VARCHAR(50),
    IN p_changed_by VARCHAR(255),
    IN p_reason TEXT,
    IN p_error_message TEXT,
    IN p_progress DECIMAL(5,2)
)
BEGIN
    DECLARE v_old_status VARCHAR(50);
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    -- 获取当前状态
    SELECT status INTO v_old_status FROM tasks WHERE id = p_task_id;
    
    -- 更新任务状态
    UPDATE tasks SET 
        status = p_new_status,
        error_message = p_error_message,
        progress = COALESCE(p_progress, progress),
        started_at = CASE WHEN p_new_status = 'RUNNING' AND started_at IS NULL THEN NOW() ELSE started_at END,
        completed_at = CASE WHEN p_new_status IN ('SUCCESS', 'FAILED', 'CANCELLED') THEN NOW() ELSE NULL END,
        updated_at = NOW()
    WHERE id = p_task_id;
    
    -- 记录状态变更历史
    INSERT INTO task_status_history (task_id, from_status, to_status, changed_by, reason)
    VALUES (p_task_id, v_old_status, p_new_status, p_changed_by, p_reason);
    
    COMMIT;
END //
DELIMITER ;

-- 创建函数：获取任务统计信息
DELIMITER //
CREATE FUNCTION GetTaskStats(p_status VARCHAR(50))
RETURNS INT
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE task_count INT DEFAULT 0;
    
    IF p_status IS NULL THEN
        SELECT COUNT(*) INTO task_count FROM tasks;
    ELSE
        SELECT COUNT(*) INTO task_count FROM tasks WHERE status = p_status;
    END IF;
    
    RETURN task_count;
END //
DELIMITER ;

-- 创建索引优化查询性能
CREATE INDEX idx_tasks_status_priority ON tasks(status, priority DESC);
CREATE INDEX idx_tasks_type_status ON tasks(task_type, status);
CREATE INDEX idx_execution_units_type_status ON execution_units(unit_type, status);

-- 初始化完成提示
SELECT 'Database initialization completed successfully!' as message;