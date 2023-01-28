import { ITree, ILeaf } from './tree';

interface IFolder {
  name: string;
  desc: string;
  stat?: string;
  size?: string;
  status?: string;
}

interface ITreeParams {
  name: string;
  id?: string;
}

export class Folder<T extends ITreeParams> extends ITree {
  // @ts-ignore
  component: T;

  constructor(component: T) {
    super();
    this.modify(component);
  }

  modify(component: T) {
    this.name = component.name;
    if (component.id) {
      this.id = component.id;
    }
    this.component = component;
  }
}

export class File<T> extends ILeaf {
  private component: T;
  constructor(component: T) {
    super();
    this.isLeaf = true;
    this.component = component;
  }

  modify(component: T) {
    this.component = component;
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
