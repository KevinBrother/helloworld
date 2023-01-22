interface MyIterator<T> {
  current(): T;
  next(): T;
  key(): number;
  valid(): boolean;
  rewind(): void;
}

interface Aggregator {
  // Retrieve an external MyIterator.
  getIterator(): MyIterator<string>;
}

class AlphabeticalOrderIterator implements MyIterator<string> {
  private collection: WordsCollection;
  private position = 0;
  private isReserved = false;

  constructor(collection: WordsCollection, isReserved = false) {
    this.collection = collection;
    this.isReserved = isReserved;
    if (this.isReserved) {
      this.position = collection.getCount() - 1;
    }
  }

  current() {
    return this.collection[this.position];
  }

  next() {
    const item = this.collection.getItems()[this.position];
    this.position += this.isReserved ? -1 : 1;

    return item;
  }

  key() {
    return this.position;
  }

  valid() {
    if (this.isReserved) {
      return this.position >= 0;
    }

    return this.position < this.collection.getCount();
  }

  rewind() {
    this.position = this.isReserved ? this.collection.getCount() - 1 : 0;
  }
}

export class WordsCollection implements Aggregator {
  private items: string[] = [];

  getItems() {
    return this.items;
  }

  getCount() {
    return this.items.length;
  }

  addItem(item: string) {
    this.items.push(item);
  }

  public getIterator(): MyIterator<string> {
    return new AlphabeticalOrderIterator(this);
  }

  public getReverseIterator(): MyIterator<string> {
    return new AlphabeticalOrderIterator(this, true);
  }
}
