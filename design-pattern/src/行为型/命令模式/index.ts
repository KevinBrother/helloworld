import { Command, SimpleCommand, ComplexCommand, Receiver } from './command';

class Invoker {
  private onStart!: Command;
  private onFinish!: Command;

  setOnStart(command: Command) {
    this.onStart = command;
  }

  setOnFinish(command: Command) {
    this.onFinish = command;
  }

  doSomethingImportant() {
    console.log('start invoker');

    if (this.isCommand(this.onStart)) {
      this.onStart.execute();
    }
    // 一些条件
    if (this.isCommand(this.onStart)) {
      this.onFinish.execute();
    }
  }

  isCommand(command: Command) {
    return !!command.execute;
  }
}

const invoker = new Invoker();
invoker.setOnStart(new SimpleCommand('simpleCommand payload '));
invoker.setOnFinish(new ComplexCommand(new Receiver(), 'something a', 'something b'));

(() => {
  invoker.doSomethingImportant();
})();
