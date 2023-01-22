export interface Command {
  execute(): void;
}

export class SimpleCommand implements Command {
  private payload: string;
  constructor(payload: string) {
    this.payload = payload;
  }

  execute() {
    console.log('simple command executed ' + this.payload);
  }
}

export class ComplexCommand implements Command {
  receiver: Receiver;
  a: string;
  b: string;

  constructor(receiver: Receiver, a: string, b: string) {
    this.receiver = receiver;
    this.a = a;
    this.b = b;
  }

  execute() {
    console.log('start do complex command');
    this.receiver.doSomething(this.a);
    this.receiver.doSomethingElse(this.b);
  }
}

export class Receiver {
  doSomething(msg: string) {
    console.log('receiver do something' + msg);
  }

  doSomethingElse(msg: string) {
    console.log('receiver do something else' + msg);
  }
}
