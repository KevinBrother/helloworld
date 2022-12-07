// @ts-check
const fs = require('fs/promises');
const path = require('path');

function resolve(...paths) {
  return path.resolve(__dirname, 'test', ...paths);
}

async function changeNames(path) {
  try {
    const dir = await fs.opendir(path);
    let i = 0;
    let prefix = '';
    for await (const dirent of dir) {
      const names = dirent.name.split('.');
      let name = names[0].replace('文件', '');
      const suffix = names[1];

      let replaceNames = '';
      if (Number(name) < 10) {
        prefix = '0';
      } else {
        prefix = '';
      }

      replaceNames = `${prefix}${name}.${suffix}`;

      console.log(replaceNames);
      await fs.rename(resolve(dirent.name), resolve(replaceNames));
      i++;
    }
  } catch (err) {
    console.error(err);
  }
}

function genNumNames(startNum, count, suffix) {
  const names = [];
  let prefix = '';
  while (startNum <= count) {
    if (startNum < 10) {
      prefix = '0';
    } else {
      prefix = '';
    }
    names.push(`${prefix}${startNum}${suffix}`);
    startNum++;
  }

  console.log(
    '%c [ names ]-35',
    'font-size:13px; background:pink; color:#bf2c9f;',
    names
  );
  return names;
}

// genNumNames(1, 22, '.png');

// changeNames(resolve(), genNumNames(1, 22, '.png'));
changeNames(resolve());
