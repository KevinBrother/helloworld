interface ITree {
  name: string;
  id: string;
  parent: ITree | null;
  nodes: ITree[];

  getNodeByKey(keyword: string, value: string | number): ITree | null;
}

export class Tree implements ITree {
  nodes: ITree[] = [];
  name = '';
  id = '';
  parent: ITree | null = null;

  constructor(tree: ITree) {
    const { name, nodes, id, parent } = tree;
    this.name = name;
    this.nodes = nodes;
    this.id = id;
    this.parent = parent;
  }

  getNodeByKey(name: 'name' | 'id', value: string | number): ITree | null {
    if (this.name === name) {
      return this;
    } else {
      if (this.nodes.length !== 0) {
        for (const file of this.nodes) {
          const temp = file.getNodeByKey(name, value);
          if (temp != null) {
            return temp;
          }
        }
      }
    }

    return null;
  }
}

export class Leaf implements ITree {
  nodes: ITree[] = [];
  name = '';
  id = '';
  parent: ITree | null = null;

  constructor(tree: ITree) {
    const { name, nodes, id, parent } = tree;
    this.name = name;
    this.nodes = nodes;
    this.id = id;
    this.parent = parent;
  }

  getNodeByKey() {
    return this;
  }
}
