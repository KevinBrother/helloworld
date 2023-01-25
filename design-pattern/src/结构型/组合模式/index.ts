import { Composite, Leaf } from './Composite';

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
