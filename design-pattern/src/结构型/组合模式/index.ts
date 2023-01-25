import { Folder, File } from './folder';

const folder = new Folder('学习资料');
const folder1 = new Folder('JavaScript');
const folder2 = new Folder('JQuery');

const file1 = new File('JavaScript设计模式');
const file2 = new File('精通JQuery');
const file3 = new File('重构');

folder1.add(file1);
folder2.add(file2);

folder.add(folder1);
folder.add(folder2);
folder.add(file3);

folder.scan();

console.log('// start remove self //');

// folder2.removeSelf();
file3.removeSelf();
folder.scan();

/* import { Composite, Leaf } from './base';

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
 */
