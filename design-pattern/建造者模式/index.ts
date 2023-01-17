import { MealBuilder } from './04.business-builder';
(function main() {
  const mealBuilder = new MealBuilder();
  const vegMeal = mealBuilder.prepareVegMeal();
  const nonVegMeal = mealBuilder.prepareNonVegMeal();

  vegMeal.showItems();
  nonVegMeal.showItems();
})();
