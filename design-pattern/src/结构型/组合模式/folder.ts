abstract class IFile {
  protected name: string = '';
  parent: IFile | null = null;
  files: IFile[] | null = null;

  abstract add(file: IFile): void;

  // 这个方法是通用的，所以才把IFile改为抽象类
  removeSelf() {
    if (!this.parent) {
      // 不在节点中
      return;
    }

    const parentChildren = this.parent.files;
    parentChildren?.splice(parentChildren.indexOf(this), 1);
  }

  abstract removeByName(name: string): void;
  abstract scan(): void;
}

export class Folder extends IFile {
  files: IFile[] = [];

  constructor(name: string) {
    super();
    this.name = name;
  }

  add(file: IFile) {
    file.parent = this;
    this.files.push(file);
  }

  removeByName(name: string) {
    if (this.name === name) {
      this.removeSelf();
      return;
    }

    this.files.forEach((file) => {
      file.removeByName(name);
    });
  }

  scan() {
    console.log('folder name: ' + this.name);
    this.files.forEach((file) => {
      file.scan();
    });
  }
}

export class File extends IFile {
  constructor(name: string) {
    super();
    this.name = name;
  }

  add() {
    throw new Error('文件下不能添加文件');
  }

  remove() {
    throw new Error('文件下不能添加文件');
  }

  removeByName(name: string) {
    throw new Error('文件下不能删除其他文件');
  }

  scan() {
    console.log('file name ' + this.name);
  }
}
