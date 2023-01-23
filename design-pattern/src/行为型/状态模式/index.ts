import { ConcreteStateA, Context } from './State';

const context = new Context(new ConcreteStateA());

context.request1();
context.request2();
