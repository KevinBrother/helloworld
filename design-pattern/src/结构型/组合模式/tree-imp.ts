import { ITree, ILeaf } from './tree';

interface ITreeParams {
  name: string;
  id?: string;
}

export class TreeImp<T extends ITreeParams> extends ITree {
  // @ts-ignore
  private component: T;

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

export class LeafImp<T extends ITreeParams> extends ILeaf {
  private component: T;
  constructor(component: T) {
    super();
    this.isLeaf = true;
    this.component = component;
  }

  modify(component: T) {
    this.component = component;
  }
}
