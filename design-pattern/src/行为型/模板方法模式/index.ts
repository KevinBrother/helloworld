import { AbstractClass, ConcreteClass1, ConcreteClass2 } from './AbstractClass';

function clientCode(abstractClass: AbstractClass) {
  abstractClass.templateMethod();
}

clientCode(new ConcreteClass1());
clientCode(new ConcreteClass2());
