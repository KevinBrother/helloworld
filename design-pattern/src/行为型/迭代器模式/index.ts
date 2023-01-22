import { WordsCollection } from './iterator';

const collection = new WordsCollection();

collection.addItem('first');
collection.addItem('second');
collection.addItem('third');

const iterator = collection.getIterator();
while (iterator.valid()) {
  console.log(iterator.next());
}

const reserved = collection.getReverseIterator();
while (reserved.valid()) {
  console.log(reserved.next());
}
