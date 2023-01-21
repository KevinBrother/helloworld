interface DrawApi {
  drawCircle(x: number, y: number, radius: number);
}

class RedCircle implements DrawApi {
  drawCircle(x: number, y: number, radius: number) {
    console.log('redCircle', x, y, radius);
  }
}
class GreenCircle implements DrawApi {
  drawCircle(x: number, y: number, radius: number) {
    console.log('greenCircle', x, y, radius);
  }
}

abstract class Shape {
  drawApi: DrawApi;
  constructor(drawApi: DrawApi) {
    this.drawApi = drawApi;
  }

  abstract draw();
}

class Circle extends Shape {
  x;
  y;
  radius;
  constructor(x: number, y: number, radius: number, drawApi: DrawApi) {
    super(drawApi);
    this.x = x;
    this.y = y;
    this.radius = radius;
  }
  draw() {
    this.drawApi.drawCircle(this.x, this.y, this.radius);
  }
}

const redCircle = new Circle(10, 10, 5, new RedCircle());
const greenCircle = new Circle(10, 10, 5, new GreenCircle());

redCircle.draw();
greenCircle.draw();
