const path = require('path');

// 不指定config，入口和输出，就默认走下面的这个配置，可能还有其他选项哦
module.exports = {
  entry: path.resolve(__dirname, './src/index.js'), // 入口文件
  output: {
    filename: 'main.js', // 默认输出的文件名
    path: path.resolve(__dirname, 'dist') // 默认输出的地址
  }
};

const entry = {
  first: {
    path: './src/first.tsx',
    moduleGraph: {
      a: { path: './src/a.tsx', moduleGraph: {} },
      utils: { path: './src/utils/index.ts', moduleGraph: {} },
      async: { path: './src/async.ts', moduleGraph: {} }
    }
  },
  second: {
    path: './src/second.tsx',
    moduleGraph: {
      b: { path: './src/b.tsx', moduleGraph: {} },
      utils: { path: './src/utils/index.ts', moduleGraph: {} }
    }
  }
};
