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

// 3. 定义工厂类
class ShapeFactory {
  getShape(name: 'Circle' | 'Square') {
    if (name == 'Square') {
      return new Square();
    } else if ((name = 'Circle')) {
      return new Circle();
    } else {
      return null;
    }
  }
}

const shapeFactory = new ShapeFactory();

const circleShape = shapeFactory.getShape('Circle');
console.log('%c [ circleShape ]-36', 'font-size:13px; background:pink; color:#bf2c9f;', circleShape?.draw());
const squareShape = shapeFactory.getShape('Square');
console.log('%c [ squareShape ]-38', 'font-size:13px; background:pink; color:#bf2c9f;', squareShape?.draw());

export {};
