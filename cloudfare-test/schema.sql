-- 创建用户表
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL,
  email TEXT UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 创建文章表
CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  content TEXT,
  user_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 插入示例数据
INSERT OR IGNORE INTO users (id, username, email) VALUES 
(1, 'admin', 'admin@example.com'),
(2, 'user1', 'user1@example.com');

INSERT OR IGNORE INTO posts (title, content, user_id) VALUES 
('Welcome Post', 'This is a welcome post for testing D1 database.', 1),
('Second Post', 'Another post to demonstrate the functionality.', 2);