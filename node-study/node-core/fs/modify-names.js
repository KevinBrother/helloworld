// @ts-check
const fs = require('fs/promises');
const path = require('path');

function resolve(...paths) {
  return path.resolve(__dirname, 'test', ...paths);
}

async function changeNames(path, replaceNames) {
  try {
    const dir = await fs.opendir(path);
    let i = 0;
    for await (const dirent of dir) {
      console.log(dirent.name);
      await fs.rename(resolve(dirent.name), resolve(replaceNames[i]));
      i++;
    }
  } catch (err) {
    console.error(err);
  }
}

changeNames(resolve(), ['a1.js', 'a2.js', 'a3.js']);
