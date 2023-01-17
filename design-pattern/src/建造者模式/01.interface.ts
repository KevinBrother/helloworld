// 第一步
export interface Packing {
  pack(): string;
}

export interface Item {
  name(): string;
  packing(): Packing;
  price(): number;
}
