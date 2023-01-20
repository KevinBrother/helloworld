interface AbstractFactory {
  createProductA(): AbstractProductA;
  createProductB(): AbstractProductB;
}

class ConcreteFactory1 implements AbstractFactory {
  createProductA(): AbstractProductA {
    return new ConcreteProductA1();
  }
  createProductB(): AbstractProductB {
    return new ConcreteProductB1();
  }
}

class ConcreteFactory2 implements AbstractFactory {
  createProductA(): AbstractProductA {
    return new ConcreteProductA2();
  }
  createProductB(): AbstractProductB {
    return new ConcreteProductB2();
  }
}

interface AbstractProductA {
  usefulFunction(): string;
}

class ConcreteProductA1 implements AbstractProductA {
  usefulFunction() {
    return 'The result of the product A1.';
  }
}
class ConcreteProductA2 implements AbstractProductA {
  usefulFunction() {
    return 'The result of the product A2.';
  }
}

interface AbstractProductB {
  usefulFunction(): string;
  anotherUsefulFunctionB(collaborator: AbstractProductA): string;
}

class ConcreteProductB1 implements AbstractProductB {
  usefulFunction() {
    return 'The result of the product A1.';
  }
  anotherUsefulFunctionB(collaborator: AbstractProductA) {
    return collaborator.usefulFunction();
  }
}
class ConcreteProductB2 implements AbstractProductB {
  usefulFunction() {
    return 'The result of the product A2.';
  }

  anotherUsefulFunctionB(collaborator: AbstractProductA) {
    return collaborator.usefulFunction();
  }
}

function clientCode(factory: AbstractFactory) {
  const productA = factory.createProductA();
  const productB = factory.createProductB();
}

const factory1 = new ConcreteFactory1();
const factory2 = new ConcreteFactory2();

clientCode(factory1);
clientCode(factory2);
