// 1, 定义接口

export interface Shape {
  draw(): string;
}

// 2. 定义实现接口的实体类
class Circle implements Shape {
  draw() {
    return 'circle';
  }
}

class Square implements Shape {
  draw() {
    return 'square';
  }
}

// 3. 定义工厂类 // 简单工厂（静态工厂模式）
class ShapeFactory {
  static getShape<T extends Shape>(shpae: new (...args: any[]) => T) {
    return new shpae();
  }
}

// 定义一个泛型函数，该函数接受一个 TypeScript 类作为参数，并返回一个新的函数。新函数将接受任意数量的参数，并返回一个新的类实例：
function createInstance<T>(ctor: new (...args: any[]) => T, ...args: any[]): T {
  return new ctor(...args);
}

const circleShape = ShapeFactory.getShape(Circle);
console.log('%c [ circleShape ]-36', 'font-size:13px; background:pink; color:#bf2c9f;', circleShape?.draw());
const squareShape = ShapeFactory.getShape(Square);
console.log('%c [ squareShape ]-38', 'font-size:13px; background:pink; color:#bf2c9f;', squareShape?.draw());

export {};
