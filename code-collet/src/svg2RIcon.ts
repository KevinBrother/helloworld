import * as fs from 'fs';
/*
* 下划线转换驼峰
*/
export function underlineToHump(str: string) {
  let upcase = str.replace(/(\w?)(?:[_-]+(\w))/g, function ($0, $1, $2) {
    return $1 + $2.toUpperCase();
  });

  // 首字母大写
  return upcase[0].toUpperCase() + upcase.slice(1);
}

// console.log(underlineToHump('a_ad_qe_dsa'));

export function removeSuffix(name: string) {
  return name.split('.')[0];
}

// 获取改目录下的所有的svg文件
export function getFilenamesByPathAndSuffix(uri: fs.PathLike, suffix = '.svg') {

  const files = fs.readdirSync(uri);
  const svgFiles = files.filter(file => file.endsWith(suffix));

  return svgFiles;
}

// const filenames = getFilenamesByPathAndSuffix('./', '.json');
// console.log('%c [ files ]-10', 'font-size:13px; background:pink; color:#bf2c9f;', filenames);

// 生成import语句
export function genImportGrammarByFileNames(filenames: string[]): string {
  let importGrammar = '';
  filenames.forEach(filename => {
    const name = removeSuffix(filename);
    const humpName = underlineToHump(name);
    importGrammar += `import ${humpName} from './${filename}';\n`;
  });
  return importGrammar;
}

// const importGrammar = genImportGrammarByFileNames(filenames);
// console.log('%c [ files ]-10', 'font-size:13px; background:pink; color:#bf2c9f;', importGrammar);

// 生成rfc语句
export function genIconRFCByFileName(fileNames: string[]) {
  let RRCGrammar = '';
  // const SideMenuAppIcon = (props: ComponentProps<typeof Icon>) => <Icon component={ SideMenuAppSvg } { ...props } />;
  fileNames.forEach(filename => {
    const name = removeSuffix(filename);
    const humpName = underlineToHump(name);
    RRCGrammar += `export const ${humpName}Icon = (props: ComponentProps<typeof Icon>) => <Icon component={ ${humpName} } { ...props } />;\n`;
  });

  return RRCGrammar;
}

// const iconRfc = genIconRFCByFileName(filenames);
// console.log('%c [ files ]-10', 'font-size:13px; background:pink; color:#bf2c9f;', iconRfc);


// 生成index.tsx文件

export function getCodeTemplate() {
  return `import React, { ComponentProps } from 'react';
import Icon from '@bixi-design/icons';`;
}
export function genTSXFile(data: string, uri = 'http./index.tsx') {
  const template =
    `${getCodeTemplate()}
${data}`;
  fs.writeFileSync(uri, template);
}

interface IParams {
  path?: fs.PathLike;
  suffix?: string;
  genUri?: string;
}
export function run({ path = './', suffix = '.svg', genUri = './index.tsx' }: IParams) {
  const filenames = getFilenamesByPathAndSuffix(path, suffix);
  const importGrammar = genImportGrammarByFileNames(filenames);
  const iconRfc = genIconRFCByFileName(filenames);
  genTSXFile(`${importGrammar}\n${iconRfc}`, genUri);
  console.log('[ success ] >');
}

run({ suffix: '.json' });