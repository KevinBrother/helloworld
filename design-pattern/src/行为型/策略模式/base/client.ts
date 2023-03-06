import { Context, ConcreteStrategyA, ConcreteStrategyB } from './server';

const context = new Context(new ConcreteStrategyA());
context.doSomething();
context.setStrategy(new ConcreteStrategyB());
context.doSomething();
export {};
