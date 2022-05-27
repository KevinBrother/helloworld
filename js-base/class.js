// 类是把函数定义在函数的原型上，性能更好
// 如果定义到对象的构造器中，性能差

class User {
  constructor(name, message) {
    this.name = name;
    this.message = message;
    // 每个对象的创建，方法都会被重新赋值
    this.getMessage = () => {
      return this.message;
    };
  }

  getName() {
    return this.name;
  }
}

const user1 = new User('John', 'Hello');

function Person(name, message) {
  this.name = name.toString();
  this.message = message.toString();
  this.getMessage = function () {
    return this.message;
  };
}

Person.prototype.getName = function () {
  return this.name;
};

const person1 = new Person('Lis', 'Hello');
