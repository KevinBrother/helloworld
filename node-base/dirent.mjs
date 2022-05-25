import fs from 'fs';

function readDir(dirPath) {
  fs.opendir(dirPath, (err, dir) => {
    console.log(dir.path, dir.fd);

    dir.read((err, dirent) => {
      console.log(dirent.name, dirent.isFile(), dirent.isDirectory());
    });
  });
}

readDir('../node-base/');
