import { Item } from './01.interface';
import { ChickenBurger, Coke, Pepsi, VegBurger } from './03.implement';

// 第五步
export class Meal {
  private items: Item[] = [];

  addItem(item: Item): void {
    this.items.push(item);
  }

  getCost() {
    return this.items.reduce((acc, item) => {
      return acc + item.price();
    }, 0);
  }

  showItems() {
    this.items.forEach(({ name, packing, price }) => {
      console.log({
        name,
        packing,
        price
      });
    });
  }
}

// 第六步
export class MealBuilder {
  prepareVegMeal() {
    const meal = new Meal();
    meal.addItem(new VegBurger());
    meal.addItem(new Coke());

    return meal;
  }

  prepareNonVegMeal() {
    const meal = new Meal();
    meal.addItem(new ChickenBurger());
    meal.addItem(new Pepsi());

    return meal;
  }
}
