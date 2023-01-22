interface Handle {
  setNext(handle: Handle): Handle;
  handle(request: string): string;
}

abstract class AbstractHandle implements Handle {
  private nextHandle!: Handle;

  setNext(handle: Handle) {
    this.nextHandle = handle;
    return this.nextHandle;
  }

  handle(request: string): string {
    if (this.nextHandle) {
      return this.nextHandle.handle(request);
    }

    return 'null' + request;
  }
}

class MonkeyHandle extends AbstractHandle {
  handle(request: string): string {
    console.log('monkey handle');
    if (request === 'banana') {
      return 'this.monkey handle' + request;
    }

    return super.handle(request);
  }
}

class DogHandle extends AbstractHandle {
  handle(request: string): string {
    console.log('DogHandle');
    if (request === 'bone') {
      return 'this.dog handle' + request;
    }

    return super.handle(request);
  }
}

class SquirrelHandle extends AbstractHandle {
  handle(request: string): string {
    console.log('squirrelHandle');
    if (request === 'nut') {
      return 'this.squirrel handle' + request;
    }

    return super.handle(request);
  }
}

const monkeyHandler = new MonkeyHandle();
const dogHandler = new DogHandle();
const squirrelHandle = new SquirrelHandle();

monkeyHandler.setNext(dogHandler).setNext(squirrelHandle);

(() => {
  console.log('%c [ monkeyHandler.handle("nut"); ]-64', 'font-size:13px; background:pink; color:#bf2c9f;', monkeyHandler.handle('nut'));
})();
