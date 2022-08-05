import * as fs from 'fs';
// const __filename = url.fileURLToPath(import.meta.url);
// const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

/*
* 下划线转换驼峰
*/
function underlineToHump(str: string) {
  let upcase = str.replace(/(\w?)(?:[_-]+(\w))/g, function ($0, $1, $2) {
    return $1 + $2.toUpperCase();
  });

  // 首字母大写
  return upcase[0].toUpperCase() + upcase.slice(1);
}

// 1. 读取文件
function getFileCode(path: string) {
  const code = fs.readFileSync(path).toString();
  return code;
}

// esm 使用__dirname有点麻烦啊！
// const url = './src/template.ts';
// const code = getFileCode(url)
// console.log('%c [ code ]-15', 'font-size:13px; background:pink; color:#bf2c9f;', code)

function humpIcon(underLine: string) {
  return underlineToHump(underLine) + 'Icon';
}

// 2. 找到标签并替换
/* function replaceTag(code: string) {

  return code.replace(/<(RpaIcon) (icon=\'(.*?)\')/g, function ($0, $1, $2, $3) {

    // console.log('%c [  ]-21', 'font-size:13px; background:pink; color:#bf2c9f;', $0, $1, $2, $3)
    return $0.replace($1, humpIcon($3)).replace($2, '');
  });
} */
// const replacedCode = replaceTag(code);
// console.log('%c [ replacedCode ]-26', 'font-size:13px; background:pink; color:#bf2c9f;', replacedCode);

function replaceTag(code: string) {
  // icon: 'jobs-status-exception'
  // icon: <JobsStatusExceptionIcon/>
  // 匹配所有 icon: 'aaa-bbb-ccc' 的字符串
  const reg = /icon: (\'(.*)\')/g;

  return code.replace(reg, function ($0, $1, $2) {
    console.log('%c [ $0, $1, $2 ]-51', 'font-size:13px; background:pink; color:#bf2c9f;', $0, $1, $2)
    const IconName = humpIcon($2);

    return $0.replace($1, `<${IconName}/>`);
  });
}


// 3. 写入文件
function write(url: string, code: string) {
  fs.writeFileSync(url, code);
}

// write(url, replacedCode);

function run(url: string) {
  const code = getFileCode(url);
  const replacedCode = replaceTag(code);
  write(url, replacedCode);
}

run('./src/template/job.ts');