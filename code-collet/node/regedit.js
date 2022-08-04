// 获取注册表信息
const regedit = require('regedit');

// TODO 添加、删除

const registryAddress = 'HKCU\\Studio';
const util = require('util');

async function main() {
  const regList = util.promisify(regedit.list);
  const result = await regList(registryAddress);
  console.log(
    '🚀 ~ file: lang-test.js ~ line 20 ~ main ~ result',
    result,
    result[registryAddress].values['language']
  );
}

main();
