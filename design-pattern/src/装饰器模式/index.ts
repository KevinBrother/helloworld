import { readonly } from './decorator';

class Person {
  first = 'hello';
  last = 'world';

  @readonly
  name() {
    return `${this.first} ${this.last}`;
  }
}

const person = new Person();
console.log('%c [before person ]-14', 'font-size:13px; background:pink; color:#bf2c9f;', person.name());

/* person.name = () => {
  return 'hahahah';
}; */
console.log('%c [after person ]-14', 'font-size:13px; background:pink; color:#bf2c9f;', person.name());
