export class Originator {
  state: string;

  constructor(state: string) {
    this.state = state;
  }

  doSomething() {
    console.log("Originator: I'm doing something important.");
    this.state = this.generateRandomString(30);
    console.log(`Originator: and my state has changed to: ${this.state}`);
  }

  private generateRandomString(length: number = 10): string {
    const charSet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

    // @ts-ignore
    return Array.apply(null, { length })
      .map(() => charSet.charAt(Math.floor(Math.random() * charSet.length)))
      .join('');
  }

  save(): Memento {
    return new ConcreteMemento(this.state);
  }

  restore(memento: Memento) {
    this.state = memento.getState();
    console.log(`Originator: My state has changed to: ${this.state}`);
  }
}

export interface Memento {
  getState(): string;
  getName(): string;
  getDate(): string;
}

export class ConcreteMemento implements Memento {
  private state: string;
  private date: string;

  constructor(state: string) {
    this.state = state;
    this.date = new Date().toISOString().slice(0, 19).replace('T', ' ');
  }

  getState() {
    return this.state;
  }
  getName() {
    return `${this.date} / (${this.state.substr(0, 9)}...)`;
  }
  getDate() {
    return this.date;
  }
}

export class Caretaker {
  mementos: Memento[] = [];
  originator: Originator;

  constructor(originator: Originator) {
    this.originator = originator;
  }

  backup() {
    this.mementos.push(this.originator.save());
  }

  undo() {
    if (this.mementos.length === 0) {
      return;
    }

    const memento = this.mementos.pop()!;
    console.log(`Caretaker: Restoring state to: ${memento.getName()}`);
    this.originator.restore(memento);
  }

  showHistory() {
    console.log("Caretaker: Here's the list of mementos:");
    for (const memento of this.mementos) {
      console.log(memento.getName());
    }
  }
}
