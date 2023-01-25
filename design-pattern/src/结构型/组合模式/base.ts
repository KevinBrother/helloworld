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

export class Leaf extends Component {
  operation() {
    return 'leaf';
  }
}

export class Composite extends Component {
  children: Component[] = [];
  add(component: Component) {
    this.children.push(component);
    component.setParent(this);
  }

  remove(component: Component) {
    const index = this.children.indexOf(component);
    this.children.splice(index, 1);
    component.setParent(null);
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
