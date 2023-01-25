interface IFile {
  name: string;
  add(file: File): void;
  remove(file: File): void;

  scan(): void;
}

export class Folder implements IFile {
  name: string;
  files: IFile[] = [];

  constructor(name: string) {
    this.name = name;
  }
  add(file: IFile) {
    this.files.push(file);
  }

  remove(file: IFile) {
    this.files.splice(this.files.indexOf(file), 1);
  }

  scan() {
    console.log('folder name: ' + this.name);
    this.files.forEach((file) => {
      file.scan();
    });
  }
}

export class File implements IFile {
  name: string;

  constructor(name: string) {
    this.name = name;
  }

  add() {
    throw new Error('文件下不能添加文件');
  }
  remove() {
    throw new Error('文件下不能添加文件');
  }

  scan() {
    console.log('file name ' + this.name);
  }
}
