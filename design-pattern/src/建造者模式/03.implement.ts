import { Burger, ColdDrink } from './02.abstrace';

// 第四步
export class VegBurger extends Burger {
  price() {
    return 12;
  }

  name = () => 'Veg Burger';
}
export class ChickenBurger extends Burger {
  price() {
    return 22;
  }

  name = () => 'Chicken Burger';
}

export class Coke extends ColdDrink {
  price() {
    return 5;
  }

  name = () => 'Coke';
}

export class Pepsi extends ColdDrink {
  price() {
    return 6;
  }

  name = () => 'pepsi';
}
