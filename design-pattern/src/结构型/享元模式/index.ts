export interface Shape {
  draw(): void;
}

class Circle {
  x: number = 0;
  y: number = 0;
  radius: number = 0;
  color: string;
  constructor(color: string) {
    this.color = color;
  }

  setX(x: number) {
    this.x = x;
  }
  setY(y: number) {
    this.y = y;
  }
  setRadius(radius: number) {
    this.radius = radius;
  }

  draw() {
    const { x, y, radius, color } = this;
    console.log('drawing... ' + JSON.stringify({ x, y, radius, color }));
  }
}

class CircleFactory {
  private static circleMap: Map<string, Circle> = new Map();

  static getCircle(color: string) {
    let circle = this.circleMap.get(color);
    if (!circle) {
      circle = new Circle(color);
      this.circleMap.set(color, circle);
    }
    return circle;
  }
}

(() => {
  const redCircle = CircleFactory.getCircle('red');
  const blueCircle = CircleFactory.getCircle('blue');

  redCircle.setX(1);
  redCircle.setY(2);
  redCircle.setRadius(10);
  redCircle.draw();

  blueCircle.setX(12);
  blueCircle.setY(12);
  blueCircle.setRadius(12);
  blueCircle.draw();
})();
