import { version } from '../package.json';
// import './styles/first.less';
import './styles/first.css';

export default function () {
  console.log('version ' + version);

  import('./foo.js').then(({ default: foo }) => {
    console.log(foo());
  });
}


class Person {
  constructor(name) {
    this.name = name;

  }
  sayHi() {
    console.log(`Hi, I'm ${this.name}`);
  }
}

export const person = new Person('John');
