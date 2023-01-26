import { ITree, Leaf } from './tree';

export class Folder extends ITree {
  constructor(name: string) {
    super();
    this.name = name;
  }
}

export class File extends Leaf {
  constructor(name: string) {
    super(name);
  }

  add() {
    throw new Error('文件下不能添加文件');
  }

  getNodeByKey(keyword: 'name' | 'id', value: string | number) {
    if (this[keyword] === value) {
      return this;
    }

    return null;
  }

  scan() {
    console.log('file name ' + this.name);
  }
}
