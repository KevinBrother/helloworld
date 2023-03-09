interface IHuman {
  getColor(): void;
  talk(): void;
  getSex(): void;
}

abstract class AbstractBlackHuman implements IHuman {
  getColor() {
    console.log('black');
  }

  talk() {
    console.log('Hello, im talking');
  }

  abstract getSex(): void;
}

abstract class AbstractYellowHuman implements IHuman {
  getColor() {
    console.log('yellow');
  }

  talk() {
    console.log('Hello, im talking');
  }

  abstract getSex(): void;
}
abstract class AbstractWhiteHuman implements IHuman {
  getColor() {
    console.log('White');
  }

  talk() {
    console.log('Hello, im talking');
  }

  abstract getSex(): void;
}

class FemaleBlackHuman extends AbstractBlackHuman {
  getSex() {
    console.log('Im female');
  }
}
class MaleBlackHuman extends AbstractBlackHuman {
  getSex() {
    console.log('Im male');
  }
}
class FemaleYellowHuman extends AbstractYellowHuman {
  getSex() {
    console.log('Im female');
  }
}
class MaleYellowHuman extends AbstractYellowHuman {
  getSex() {
    console.log('Im male');
  }
}
class FemaleWhiteHuman extends AbstractWhiteHuman {
  getSex() {
    console.log('Im female');
  }
}
class MaleWhiteHuman extends AbstractWhiteHuman {
  getSex() {
    console.log('Im male');
  }
}

interface IHumanFactory {
  createYellowHuman(): IHuman;
  createBlackHuman(): IHuman;
  createWhiteHuman(): IHuman;
}

export class MaleFactory implements IHumanFactory {
  createYellowHuman() {
    return new MaleYellowHuman();
  }
  createBlackHuman() {
    return new MaleBlackHuman();
  }
  createWhiteHuman() {
    return new MaleWhiteHuman();
  }
}

export class FemaleFactory implements IHumanFactory {
  createYellowHuman() {
    return new FemaleYellowHuman();
  }
  createBlackHuman() {
    return new FemaleBlackHuman();
  }
  createWhiteHuman() {
    return new FemaleWhiteHuman();
  }
}
