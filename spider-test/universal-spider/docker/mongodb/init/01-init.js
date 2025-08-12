// MongoDB初始化脚本

// 切换到spider_logs数据库
db = db.getSiblingDB('spider_logs');

// 创建爬取数据集合
db.createCollection('crawled_data', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['task_id', 'url', 'data', 'crawled_at'],
      properties: {
        task_id: {
          bsonType: 'int',
          description: '任务ID'
        },
        url: {
          bsonType: 'string',
          description: '爬取的URL'
        },
        title: {
          bsonType: 'string',
          description: '页面标题'
        },
        data: {
          bsonType: 'object',
          description: '提取的数据'
        },
        metadata: {
          bsonType: 'object',
          description: '元数据信息'
        },
        media_files: {
          bsonType: 'array',
          description: '媒体文件列表'
        },
        crawled_at: {
          bsonType: 'date',
          description: '爬取时间'
        },
        processing_time: {
          bsonType: 'number',
          description: '处理时间(毫秒)'
        }
      }
    }
  }
});

// 创建系统日志集合
db.createCollection('system_logs', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['level', 'message', 'timestamp'],
      properties: {
        level: {
          enum: ['debug', 'info', 'warn', 'error', 'fatal'],
          description: '日志级别'
        },
        message: {
          bsonType: 'string',
          description: '日志消息'
        },
        service: {
          bsonType: 'string',
          description: '服务名称'
        },
        module: {
          bsonType: 'string',
          description: '模块名称'
        },
        task_id: {
          bsonType: 'int',
          description: '关联任务ID'
        },
        user_id: {
          bsonType: 'int',
          description: '用户ID'
        },
        details: {
          bsonType: 'object',
          description: '详细信息'
        },
        stack_trace: {
          bsonType: 'string',
          description: '错误堆栈'
        },
        timestamp: {
          bsonType: 'date',
          description: '时间戳'
        }
      }
    }
  }
});

// 创建性能监控集合
db.createCollection('performance_metrics', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['metric_name', 'value', 'timestamp'],
      properties: {
        metric_name: {
          bsonType: 'string',
          description: '指标名称'
        },
        value: {
          bsonType: 'number',
          description: '指标值'
        },
        unit: {
          bsonType: 'string',
          description: '单位'
        },
        tags: {
          bsonType: 'object',
          description: '标签'
        },
        service: {
          bsonType: 'string',
          description: '服务名称'
        },
        timestamp: {
          bsonType: 'date',
          description: '时间戳'
        }
      }
    }
  }
});

// 创建错误报告集合
db.createCollection('error_reports', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['error_type', 'message', 'timestamp'],
      properties: {
        error_type: {
          enum: ['network', 'parsing', 'validation', 'system', 'anti_bot'],
          description: '错误类型'
        },
        message: {
          bsonType: 'string',
          description: '错误消息'
        },
        task_id: {
          bsonType: 'int',
          description: '任务ID'
        },
        url: {
          bsonType: 'string',
          description: '出错的URL'
        },
        stack_trace: {
          bsonType: 'string',
          description: '错误堆栈'
        },
        context: {
          bsonType: 'object',
          description: '错误上下文'
        },
        retry_count: {
          bsonType: 'int',
          description: '重试次数'
        },
        resolved: {
          bsonType: 'bool',
          description: '是否已解决'
        },
        timestamp: {
          bsonType: 'date',
          description: '时间戳'
        }
      }
    }
  }
});

// 创建索引

// crawled_data集合索引
db.crawled_data.createIndex({ 'task_id': 1 });
db.crawled_data.createIndex({ 'url': 1 });
db.crawled_data.createIndex({ 'crawled_at': -1 });
db.crawled_data.createIndex({ 'task_id': 1, 'crawled_at': -1 });
db.crawled_data.createIndex({ 'data.title': 'text', 'data.content': 'text' }); // 全文搜索

// system_logs集合索引
db.system_logs.createIndex({ 'level': 1 });
db.system_logs.createIndex({ 'service': 1 });
db.system_logs.createIndex({ 'task_id': 1 });
db.system_logs.createIndex({ 'timestamp': -1 });
db.system_logs.createIndex({ 'level': 1, 'timestamp': -1 });
db.system_logs.createIndex({ 'service': 1, 'timestamp': -1 });

// performance_metrics集合索引
db.performance_metrics.createIndex({ 'metric_name': 1 });
db.performance_metrics.createIndex({ 'service': 1 });
db.performance_metrics.createIndex({ 'timestamp': -1 });
db.performance_metrics.createIndex({ 'metric_name': 1, 'timestamp': -1 });
db.performance_metrics.createIndex({ 'service': 1, 'metric_name': 1, 'timestamp': -1 });

// error_reports集合索引
db.error_reports.createIndex({ 'error_type': 1 });
db.error_reports.createIndex({ 'task_id': 1 });
db.error_reports.createIndex({ 'resolved': 1 });
db.error_reports.createIndex({ 'timestamp': -1 });
db.error_reports.createIndex({ 'error_type': 1, 'timestamp': -1 });
db.error_reports.createIndex({ 'task_id': 1, 'timestamp': -1 });

// 创建TTL索引（自动删除旧数据）
// 系统日志保留30天
db.system_logs.createIndex({ 'timestamp': 1 }, { expireAfterSeconds: 2592000 });

// 性能指标保留90天
db.performance_metrics.createIndex({ 'timestamp': 1 }, { expireAfterSeconds: 7776000 });

// 已解决的错误报告保留7天
db.error_reports.createIndex({ 'timestamp': 1 }, { 
  expireAfterSeconds: 604800,
  partialFilterExpression: { 'resolved': true }
});

print('MongoDB初始化完成');
print('已创建集合: crawled_data, system_logs, performance_metrics, error_reports');
print('已创建相应的索引和TTL规则');