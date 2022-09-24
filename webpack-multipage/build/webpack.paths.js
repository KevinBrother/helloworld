const path = require('path');

const rootPath = path.join(__dirname, '..');
const srcPath = path.join(rootPath, 'src');
const srcNodeModulesPath = path.join(rootPath, 'node_modules');
const distPath = path.join(rootPath, 'dist');

// const dllPath = path.join(__dirname, '../dll');
// const srcMainPath = path.join(srcPath, 'main');
// const srcRendererPath = path.join(srcPath, 'renderer');

// const releasePath = path.join(rootPath, 'release');
// const appPath = path.join(releasePath, 'app');
// const appPackagePath = path.join(appPath, 'package.json');
// const appNodeModulesPath = path.join(appPath, 'node_modules');

// const distPath = path.join(appPath, 'dist');
// const distMainPath = path.join(distPath, 'main');
// const distRendererPath = path.join(distPath, 'renderer');

// const buildPath = path.join(releasePath, 'build');

module.exports = {
  rootPath,
  srcPath,
  srcNodeModulesPath,
  distPath
};
