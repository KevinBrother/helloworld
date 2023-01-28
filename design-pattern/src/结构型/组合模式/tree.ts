export abstract class ITree {
  protected nodes: ITree[] = [];
  name = '';
  id = this.genId();
  protected parent: ITree | null = null;
  protected isLeaf = false;
  // TODO 设置是否子节点自动变更类型
  protected treeModel: 'a' | 'b' = 'a';

  add(node: ITree) {
    node.parent = this;
    this.nodes.push(node);
  }

  removeSelf() {
    if (!this.parent) {
      // 不在节点中
      return;
    }

    const parentNodes = this.parent.nodes;
    parentNodes?.splice(parentNodes.indexOf(this), 1);
    if (this.treeModel === 'a' && parentNodes.length === 0) {
      this.parent.isLeaf = true;
    }
  }

  setParent(parent: ITree) {
    this.parent = parent;
  }

  getNodeByKey(keyword: 'name' | 'id', value: string | number): ITree | null {
    if (this[keyword] === value) {
      return this;
    }

    if (this.nodes.length !== 0) {
      for (const file of this.nodes) {
        const temp = file.getNodeByKey(keyword, value);
        if (temp != null) {
          return temp;
        }
      }
    }

    return null;
  }

  scan() {
    console.log('folder name: ' + this.name);
    this.nodes.forEach((node) => {
      node.scan();
    });
  }

  genId() {
    return Math.random().toString(5);
  }
}

export class ILeaf extends ITree {
  /*   constructor(name: string) {
    super();
    this.name = name;
    this.isLeaf = true;
  } */

  add(node: ITree) {
    node.setParent(this);
    this.isLeaf = false;
    this.nodes.push(node);
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
