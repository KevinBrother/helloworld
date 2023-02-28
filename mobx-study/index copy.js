const { makeAutoObservable, toJS, autorun, reaction, computed } = require('mobx');

class Jobs {
  items = [];
  constructor() {
    makeAutoObservable(this);
  }

  add(item) {
    this.items.push(item);
  }
}

class Son {
  name;
  age;
  jobs = [];

  constructor(name, age, jobs) {
    this.name = name;
    this.age = age;
    this.jobs = jobs;
    makeAutoObservable(this);
  }

  addJob(job) {
    this.jobs.push(job);
  }

  get jobLength() {
    return this.jobs.length;
  }
}

class User {
  name;
  age;
  sons = [];
  constructor(name, age) {
    this.name = name;
    this.age = age;
    this.sons.push(new Son('li', 20, ['frontend']));
    makeAutoObservable(this);
  }

  incrementAge() {
    this.age++;
  }

  get sonLength() {
    console.log(this.sons.length);
  }
}

const user = new User('张三', 58);
// console.log('%c [ user ]-19', 'font-size:13px; background:pink; color:#bf2c9f;', toJS(user));

/* autorun(() => {
  console.log('user.age:', user.age);
});

autorun(() => {
  console.log('user:', user);
}); */

/* reaction(
  () => user.age,
  (age) => {
    console.log('age:', age);
    console.log('Energy level:', user.age);
  }
); */

/* setTimeout(() => {
  user.incrementAge();
}, 1000);
 */

let flag = false;
// const sons = user.sons;
/* console.log('%c [ flag ]-47', 'font-size:13px; background:pink; color:#bf2c9f;', flag);
if (!flag) {
  return;
}
user.sons.forEach((jobs) =>
  jobs.forEach((job) => {
    reaction(
      () => job,
      (job) => {
        if (!flag) {
          return;
        }
        console.log('%c [ sons.length ]-62', 'font-size:13px; background:pink; color:#bf2c9f;', sons.length);
      }
    );
  })
); */
// console.log('user:', sons.length);

setTimeout(() => {
  flag = true;
  user.sons[0].jobs.push('backend');
  // console.log('%c [ user.sons.length ]-51', 'font-size:13px; background:pink; color:#bf2c9f;', user.sons.length);
}, 1000);

/* let flag = false;
reaction(
  () => user.sons,
  (sons) => {
    if (!flag) {
      return;
    }
    console.log('%c [ sons.length ]-62', 'font-size:13px; background:pink; color:#bf2c9f;', sons.length);
  }
);

setTimeout(() => {
  flag = true;
  user.sons.push({ name: 'li', age: 10 });
  console.log('%c [ user.sons.length ]-51', 'font-size:13px; background:pink; color:#bf2c9f;', user.sons.length);
}, 1000);
 */
