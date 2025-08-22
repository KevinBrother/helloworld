const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3001;
const TASK_MANAGER_URL = process.env.TASK_MANAGER_URL || 'http://task-manager:3000';

app.use(express.json());

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// 执行任务
app.post('/execute', async (req, res) => {
  const { taskId, taskData } = req.body;
  
  console.log(`执行任务 ${taskId}:`, taskData);
  
  try {
    // 模拟任务执行
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 模拟任务结果
    const result = {
      taskId,
      status: 'completed',
      result: `任务 ${taskId} 执行成功`,
      executedAt: new Date().toISOString()
    };
    
    console.log(`任务 ${taskId} 执行完成:`, result);
    res.json(result);
  } catch (error) {
    console.error(`任务 ${taskId} 执行失败:`, error);
    res.status(500).json({
      taskId,
      status: 'failed',
      error: error.message,
      executedAt: new Date().toISOString()
    });
  }
});

// 获取执行单元状态
app.get('/status', (req, res) => {
  res.json({
    id: 'example-unit-1',
    name: '示例执行单元',
    status: 'available',
    capacity: 5,
    currentLoad: 0,
    lastHeartbeat: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`执行单元示例服务启动在端口 ${PORT}`);
  console.log(`任务管理器地址: ${TASK_MANAGER_URL}`);
});