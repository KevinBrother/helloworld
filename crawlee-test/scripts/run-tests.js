#!/usr/bin/env node

import { spawn } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';

const testFiles = [
  'tests/setup.test.ts',
  'tests/unit/basic-crawler.test.ts',
  'tests/unit/browser-automation.test.ts',
  'tests/unit/performance-optimization.test.ts', 
  'tests/unit/deduplication-caching.test.ts',
  'tests/integration/full-crawl-flow.test.ts'
];

const testDescriptions = {
  'tests/setup.test.ts': '🔧 测试环境设置',
  'tests/unit/basic-crawler.test.ts': '🚀 基础爬虫功能',
  'tests/unit/browser-automation.test.ts': '🌐 浏览器自动化',
  'tests/unit/performance-optimization.test.ts': '⚡ 性能优化',
  'tests/unit/deduplication-caching.test.ts': '🔄 去重和缓存',
  'tests/integration/full-crawl-flow.test.ts': '🔗 完整爬取流程'
};

console.log('🎯 Crawlee 测试驱动学习项目');
console.log('=====================================');
console.log('');

async function runTest(testFile, description) {
  console.log(`\n${description}`);
  console.log('─'.repeat(50));
  
  if (!existsSync(testFile)) {
    console.log(`❌ 测试文件不存在: ${testFile}`);
    return false;
  }
  
  return new Promise((resolve) => {
    const child = spawn('pnpm', ['test:run', testFile], {
      stdio: 'inherit',
      shell: true
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ ${description} - 测试通过`);
        resolve(true);
      } else {
        console.log(`❌ ${description} - 测试失败 (退出码: ${code})`);
        resolve(false);
      }
    });
  });
}

async function runAllTests() {
  const results = [];
  const startTime = Date.now();
  
  for (const testFile of testFiles) {
    const description = testDescriptions[testFile];
    const success = await runTest(testFile, description);
    results.push({ testFile, description, success });
  }
  
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  
  console.log('\n');
  console.log('📊 测试结果汇总');
  console.log('=====================================');
  
  let passedCount = 0;
  let failedCount = 0;
  
  results.forEach(({ description, success }) => {
    const status = success ? '✅ 通过' : '❌ 失败';
    console.log(`${status} ${description}`);
    
    if (success) {
      passedCount++;
    } else {
      failedCount++;
    }
  });
  
  console.log('');
  console.log(`总计: ${results.length} 个测试套件`);
  console.log(`通过: ${passedCount}`);
  console.log(`失败: ${failedCount}`);
  console.log(`总耗时: ${duration}秒`);
  
  if (failedCount === 0) {
    console.log('\n🎉 所有测试都通过了！你已经掌握了 Crawlee 的核心功能！');
  } else {
    console.log(`\n⚠️  有 ${failedCount} 个测试套件失败，请检查具体错误信息。`);
  }
  
  return failedCount === 0;
}

// 处理命令行参数
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log('使用方法:');
  console.log('  node scripts/run-tests.js           # 运行所有测试');
  console.log('  node scripts/run-tests.js --setup   # 只运行环境设置测试');
  console.log('  node scripts/run-tests.js --basic   # 只运行基础功能测试');
  console.log('  node scripts/run-tests.js --help    # 显示帮助信息');
  process.exit(0);
}

if (args.includes('--setup')) {
  runTest('tests/setup.test.ts', testDescriptions['tests/setup.test.ts'])
    .then(success => process.exit(success ? 0 : 1));
} else if (args.includes('--basic')) {
  runTest('tests/unit/basic-crawler.test.ts', testDescriptions['tests/unit/basic-crawler.test.ts'])
    .then(success => process.exit(success ? 0 : 1));
} else {
  runAllTests()
    .then(allPassed => process.exit(allPassed ? 0 : 1))
    .catch(error => {
      console.error('运行测试时出错:', error);
      process.exit(1);
    });
}