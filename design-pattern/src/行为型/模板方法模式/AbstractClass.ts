export abstract class AbstractClass {
  templateMethod() {
    this.baseOperation1();
    this.requiredOperations1();
    this.baseOperation2();
    this.hook1();
    this.requiredOperation2();
    this.baseOperation3();
    this.hook2();
  }

  protected baseOperation1(): void {
    console.log('AbstractClass says: I am doing the bulk of the work');
  }

  protected baseOperation2(): void {
    console.log('AbstractClass says: But I let subclasses override some operations');
  }

  protected baseOperation3(): void {
    console.log('AbstractClass says: But I am doing the bulk of the work anyway');
  }

  protected abstract requiredOperations1(): void;

  protected abstract requiredOperation2(): void;

  protected hook1(): void {}

  protected hook2(): void {}
}

export class ConcreteClass1 extends AbstractClass {
  requiredOperations1() {
    console.log('concerte class‘1   requiredOperations1');
  }
  requiredOperation2() {
    console.log('concerte class‘1   requiredOperations2');
  }
}
export class ConcreteClass2 extends AbstractClass {
  requiredOperations1() {
    console.log('concerte class‘2   requiredOperations1');
  }
  requiredOperation2() {
    console.log('concerte class‘2   requiredOperations2');
  }
}
