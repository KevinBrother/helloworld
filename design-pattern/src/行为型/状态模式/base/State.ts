export abstract class State {
  protected context!: Context;

  public setContext(context: Context) {
    this.context = context;
  }

  public abstract handle1(): void;

  public abstract handle2(): void;
}

export class Context {
  private state!: State;

  constructor(state: State) {
    this.transitionTo(state);
  }

  transitionTo(state: State) {
    console.log(`Context: Transition to ${(<any>state).constructor.name}.`);
    this.state = state;
    state.setContext(this);
  }

  request1() {
    this.state.handle1();
  }

  request2() {
    this.state.handle2();
  }
}

export class ConcreteStateA extends State {
  public handle1() {
    console.log('ConcreteStateA handles request1.');
    console.log('ConcreteStateA wants to change the state of the context.');
    this.context.transitionTo(new ConcreteStateB());
  }
  public handle2() {
    console.log('不会执行，只是为了实现接口');
  }
}

export class ConcreteStateB extends State {
  public handle1() {
    console.log('不会执行，只是为了实现接口');
  }
  public handle2() {
    console.log('ConcreteStateB handles request2.');
    console.log('ConcreteStateB wants to change the state of the context.');

    this.context.transitionTo(new ConcreteStateA());
  }
}
