interface ComputerPart {
  accept(computerPartVisitor: ComputerPartVisitor);
}

interface ComputerPartVisitor {
  visit(mouse: Mouse);
  visit(keyboard: Keyboard);
}

class Mouse implements ComputerPart {
  accept(computerPartVisitor: ComputerPartVisitor) {
    computerPartVisitor.visit(this);
  }
}

class Keyboard implements ComputerPart {
  accept(computerPartVisitor: ComputerPartVisitor) {
    computerPartVisitor.visit(this);
  }
}

export class Computer implements ComputerPart {
  computerParts: ComputerPart[] = [];

  constructor() {
    this.computerParts.push(new Mouse(), new Keyboard());
  }

  accept(computerPartVisitor: ComputerPartVisitor) {
    this.computerParts.forEach((item) => {
      item.accept(computerPartVisitor);
    });
  }
}

export class ComputerPartDisplayVisitor implements ComputerPartVisitor {
  /*   visit(mouse: Mouse) {
    console.log('Computer mouse');
  }
  visit(keyboard: Keyboard) {
    console.log('Computer keyboard');
  } */

  visit(computerPart: ComputerPart) {
    if (computerPart instanceof Mouse) {
      console.log('Computer mouse');
    } else if (computerPart instanceof Keyboard) {
      console.log('Computer Keyboard');
    }
  }
}
