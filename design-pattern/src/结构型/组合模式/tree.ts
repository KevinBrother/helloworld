export abstract class ITree {
  protected nodes: ITree[] = [];
  protected name = '';
  protected id = this.genId();
  protected parent: ITree | null = null;
  protected isLeaf = false;

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
  }

  setParent(parent: ITree) {
    this.parent = parent;
  }

  getNodeByKey(keyword: 'name' | 'id', value: string | number): ITree | null {
    if (this[keyword] === value) {
      return this;
    } else {
      if (this.nodes.length !== 0) {
        for (const file of this.nodes) {
          const temp = file.getNodeByKey(keyword, value);
          if (temp != null) {
            return temp;
          }
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

export class Leaf extends ITree {
  constructor(name: string) {
    super();
    this.name = name;
    this.isLeaf = true;
  }

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
