const fs = require('fs');

function removeSuffix(name) {
  return name.split('.')[0];
}

/*
 * 下划线转换驼峰
 */
function underlineToHump(str) {
  let upcase = str.replace(/(\w?)(?:[_-]+(\w))/g, function ($0, $1, $2) {
    return $1 + $2.toUpperCase();
  });

  // 首字母大写
  return upcase[0].toUpperCase() + upcase.slice(1);
}

// 1. 获取改目录下的所有的svg文件
function getFilenamesByPathAndSuffix(uri, suffix = '.svg') {
  const files = fs.readdirSync(uri);
  const svgFiles = files.filter((file) => file.endsWith(suffix));

  return svgFiles;
}

// 2. 生成import语句
function genImportGrammarByFileNames(filenames) {
  let importGrammar = '';
  filenames.forEach((filename) => {
    const name = removeSuffix(filename);
    const humpName = underlineToHump(name);
    importGrammar += `import ${humpName} from './${filename}';\n`;
  });
  return importGrammar;
}

// 3. 生成rfc语句
function genIconRFCByFileName(fileNames) {
  let RRCGrammar = '';
  // const SideMenuAppIcon = (props: ComponentProps<typeof Icon>) => <Icon component={ SideMenuAppSvg } { ...props } />;
  fileNames.forEach((filename) => {
    const name = removeSuffix(filename);
    const humpName = underlineToHump(name);
    RRCGrammar += `expxort const ${humpName}Icon = (props: ComponentProps<typeof Icon>) => <Icon component={ ${humpName} } { ...props } />;\n`;
  });

  return RRCGrammar;
}

// 4. 生成index.tsx文件
function getCodeTemplate() {
  return `import React, { ComponentProps } from 'react';
import Icon from '@bixi-design/icons';`;
}
function genTSXFile(data, uri = 'http./index.tsx') {
  const template = `${getCodeTemplate()}
${data}`;
  fs.writeFileSync(uri, template);
}

function run({ path = './', suffix = '.svg', genUri = './index.tsx' }) {
  const filenames = getFilenamesByPathAndSuffix(path, suffix);
  const importGrammar = genImportGrammarByFileNames(filenames);
  const iconRfc = genIconRFCByFileName(filenames);
  genTSXFile(`${importGrammar}\n${iconRfc}`, genUri);
  console.log('[ success ] >');
}

// run({ suffix: '.json' });
run({
  path: './ricons/side-menu',
  suffix: '.svg',
  genUri: './ricons/side-menu/index.tsx'
});
