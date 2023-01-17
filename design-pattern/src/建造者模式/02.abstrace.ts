import { Item, Packing } from './01.interface';

// 第二步
class Wrapper implements Packing {
  pack() {
    return 'wrapper';
  }
}

class Bottle implements Packing {
  pack() {
    return 'bottle';
  }
}

// 第三步
export abstract class Burger implements Item {
  packing() {
    return new Wrapper();
  }
  abstract price(): number;
  abstract name(): string;
}

export abstract class ColdDrink implements Item {
  packing() {
    return new Bottle();
  }
  abstract price(): number;
  abstract name(): string;
}
