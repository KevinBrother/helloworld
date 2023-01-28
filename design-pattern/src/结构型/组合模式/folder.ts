import { ITree, Leaf } from './tree';

interface IFolder {
  name: string;
  desc: string;
  stat: string;
  size: string;
  status: string;
}

interface ITreeParams {
  name: string;
  id?: string;
}

export class Folder<T extends ITreeParams> extends ITree {
  component: T;

  constructor(component: T) {
    super();
    this.name = component.name;
    if (component.id) {
      this.id = component.id;
    }

    this.component = component;
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
