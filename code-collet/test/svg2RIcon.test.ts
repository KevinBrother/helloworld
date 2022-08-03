import {
  getFilenamesByPathAndSuffix,
  genImportGrammarByFileNames,
  genIconRFCByFileName,
  genTSXFile
} from '../src/svg2RIcon'
import { underlineToHump } from '../src/utils/index';

test('a_ad_qe_dsa to upperCase', () => {
  expect(underlineToHump('a_ad_qe_dsa')).toEqual('AAdQeDsa');
})

test('获取所有后缀为json的文件名', () => {
  // TODO 这么写也是过的，有问题

  const filenames = getFilenamesByPathAndSuffix('./', '.json');
  filenames.forEach(filename => {
    expect(filename.includes('.js')).toBeTruthy();
  })
})
