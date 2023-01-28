import { TreeImp, LeafImp } from './tree-imp';

interface ICategory {
  name: string;
  desc: string;
}

/* 
// TODO 没有完全兼容，可能需要代理模式之类的来转一下
interface ICategory {
  pId: string;
  id: string;
  name: string;
  desc: string;
} */

export class Category extends LeafImp<ICategory> {}

const category = new Category({ name: 'file', desc: 'File' });
