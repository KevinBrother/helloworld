const fs = require('fs');

/*
 * 下划线转换驼峰
 */
function underlineToHump(str) {
  const upcase = str.replace(/(\w?)(?:[_-]+(\w))/g, function ($0, $1, $2) {
    return $1 + $2.toUpperCase();
  });
  // 首字母大写
  return upcase[0].toUpperCase() + upcase.slice(1);
}

// 1. 读取文件
function getFileCode(path) {
  const code = fs.readFileSync(path).toString();
  return code;
}
function humpIcon(underLine) {
  return underlineToHump(underLine) + 'Icon';
}
// 2. 找到标签并替换
function replaceTag(code) {
  return code.replace(
    /<(RpaIcon) (icon=\'(.*?)\')/g,
    function ($0, $1, $2, $3) {
      return $0.replace($1, humpIcon($3)).replace($2, '');
    }
  );
}

// 3. 写入文件
function write(url, code) {
  fs.writeFileSync(url, code);
}

function run(url) {
  const code = getFileCode(url);
  const replacedCode = replaceTag(code);
  write(url, replacedCode);
}

run('./src/routers/menu-tree.tsx');
