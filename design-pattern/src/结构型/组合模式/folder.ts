abstract class IFile {
  protected name: string = '';
  parent: IFile | null = null;
  nodes: IFile[] = [];

  abstract add(file: IFile): void;

  // 这个方法是通用的，所以才把IFile改为抽象类
  removeSelf() {
    if (!this.parent) {
      // 不在节点中
      return;
    }

    const parentChildren = this.parent.nodes;
    parentChildren?.splice(parentChildren.indexOf(this), 1);
  }

  abstract getChildrenByName(name: string): IFile | null;

  abstract removeByName(name: string): void;
  abstract scan(): void;
}

export class Folder extends IFile {
  nodes: IFile[] = [];

  constructor(name: string) {
    super();
    this.name = name;
  }

  add(file: IFile) {
    file.parent = this;
    this.nodes.push(file);
  }

  getChildrenByName(name: string) {
    // 如果是当前的名字相等，则返回自己
    // 如果，没有子节点，则返回null
    // 否则遍历子节点，（结果正确则返回，否则不返回）
    if (this.name === name) {
      return this;
    } else {
      if (this.nodes.length !== 0) {
        for (const file of this.nodes) {
          const temp = file.getChildrenByName(name);
          if (temp != null) {
            return temp;
          }
        }
      }
    }

    return null;
  }

  removeByName(name: string) {
    if (this.name === name) {
      this.removeSelf();
      return;
    }

    this.nodes.forEach((file) => {
      file.removeByName(name);
    });
  }

  scan() {
    console.log('folder name: ' + this.name);
    this.nodes.forEach((file) => {
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

  getChildrenByName() {
    // throw new Error('文件下没有子文件');
    return null;
  }

  removeByName(name: string) {
    if (this.name === name) {
      this.removeSelf();
      return;
    }
  }

  scan() {
    console.log('file name ' + this.name);
  }
}
