abstract class LiftState {
  context!: Context;

  setContext(context: Context) {
    this.context = context;
  }

  open = () => {
    console.log(`当前处于状态: ${this.context.getState()} 中， 不能打开`);
  };
  run = () => {
    console.log(`当前处于状态: ${this.context.getState()} 中， 不能升降`);
  };
  stop = () => {
    console.log(`当前处于状态: ${this.context.getState()} 中， 不能停止`);
  };
  close = () => {
    console.log(`当前处于状态: ${this.context.getState()} 中， 不能关门`);
  };
}

class OpeningState extends LiftState {
  open = () => {
    console.log('电梯门打开中。。。');
    this.context.setState(EnumLiftState.open);
  };

  close = () => {
    this.context.setOperation(Context.operationClose);
    this.context.getOperation().close();
  };
}
class RuningState extends LiftState {
  run = () => {
    console.log('电梯运行中。。。');
    this.context.setState(EnumLiftState.run);
  };

  stop = () => {
    this.context.setOperation(Context.operationStop);
    this.context.getOperation().stop();
  };
}
class CloseingState extends LiftState {
  close = () => {
    console.log('电梯门关闭中。。。');
    this.context.setState(EnumLiftState.closed);
  };

  open = () => {
    this.context.setOperation(Context.operationOpen);
    this.context.getOperation().open();
  };

  run = () => {
    this.context.setOperation(Context.operationRun);
    this.context.getOperation().run();
  };
}

class StopingState extends LiftState {
  stop = () => {
    console.log('电梯停止中');
    this.context.setState(EnumLiftState.stop);
  };

  open = () => {
    this.context.setOperation(Context.operationOpen);
    this.context.getOperation().open();
  };
  run = () => {
    this.context.setOperation(Context.operationRun);
    this.context.getOperation().run();
  };
}

export enum EnumLiftState {
  open = 'open',
  closed = 'closed',
  run = 'run',
  stop = 'stop'
}

export class Context {
  static operationOpen = new OpeningState();
  static operationRun = new RuningState();
  static operationStop = new StopingState();
  static operationClose = new CloseingState();

  private state!: EnumLiftState;
  private operation!: LiftState;

  constructor(operation: LiftState, state: EnumLiftState) {
    this.setState(state);
    this.setOperation(operation);
  }

  getState() {
    return this.state;
  }

  setState(state: EnumLiftState) {
    this.state = state;
  }

  setOperation(operation: LiftState) {
    this.operation = operation;
    this.operation.setContext(this);
  }

  getOperation() {
    return this.operation;
  }

  open() {
    this.operation.open();
  }
  close() {
    this.operation.close();
  }
  run() {
    this.operation.run();
  }
  stop() {
    this.operation.stop();
  }
}
