abstract class Component {
  private parent!: Component | null;

  setParent(parent: Component | null) {
    this.parent = parent;
  }

  getParent(): Component | null {
    return this.parent;
  }

  add(component: Component) {}
  remove(component: Component) {}

  isComposite() {
    return false;
  }

  abstract operation(): string;
}

class Leaf extends Component {
  operation() {
    return 'leaf';
  }
}

class Composite extends Component {
  children: Component[] = [];
  add(component: Component) {
    this.children.push(component);
    this.setParent(this);
  }

  remove(component: Component) {
    const index = this.children.indexOf(component);
    this.children.splice(index, 1);
    this.setParent(null);
  }

  isComposite() {
    return true;
  }

  operation(): string {
    const results: string[] = [];
    for (const child of this.children) {
      results.push(child.operation());
    }

    return `Branch(${results.join('+')})`;
  }
}

const tree = new Composite();

const branch1 = new Composite();
const branch2 = new Composite();

const leaf1 = new Leaf();
const leaf2 = new Leaf();

branch1.add(leaf1);
branch2.add(leaf2);

tree.add(branch1);
tree.add(branch2);

tree.operation();
console.log('%c [ tree.operation() ]-70', 'font-size:13px; background:pink; color:#bf2c9f;', tree.operation());
