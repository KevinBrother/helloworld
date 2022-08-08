const fs = require('fs');
const path = require('path');

// 获取路径下的所有的文件
function getFilesByPath(path) {
  const filenames = fs.readdirSync(path);
  return filenames;
}

// 获取改目录下的所有的svg文件
/* function getFilenamesByUriAndSuffix(uri, suffix = '.svg') {
  const files = fs.readdirSync(uri);
  const svgFiles = files.filter((file) => file.endsWith(suffix));
  return svgFiles;
}
 */
// 是文件夹则递归获取子文件
// .svg文件则返回所有的.svg文件名，以及当前路径名 + index.jsx

function getFilenamesByUriAndSuffix(uri) {
  console.log(uri);
}

// 调用遍历该路径下所有文件的方法

function getFilesByUri(uri) {
  const filenames = fs.readdirSync(uri);
  filenames.forEach((filename) => {
    const filePath = path.join(uri, filename);
    if (fs.statSync(filePath).isDirectory()) {
      getFilenamesByUriAndSuffix(filePath);
      getFilesByUri(filePath);
    }
  });
}

const testPath = path.join(__dirname, '../');
console.log(
  '%c [ testPath ]-37',
  'font-size:13px; background:pink; color:#bf2c9f;',
  testPath
);
getFilesByUri(testPath);
