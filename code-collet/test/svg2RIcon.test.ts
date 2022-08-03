import {
  underlineToHump,
  getFilenamesByPathAndSuffix,
  genImportGrammarByFileNames,
  genIconRFCByFileName,
  genTSXFile
} from '../src/svg2RIcon'

test('a_ad_qe_dsa to upperCase', () => {
  expect(underlineToHump('a_ad_qe_dsa')).toEqual('AAdQeDsa');
})

test('获取所有后缀为json的文件名', () => {
  const filenames = getFilenamesByPathAndSuffix('./', '.json');
})
