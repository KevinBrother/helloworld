// 与Iterable接口类似，任何实现Iterator接口的对象都可以作为迭代器使用。
// 有缺陷、只能迭代一次
class Counter {
  constructor(limit) {
    this.count = 1;
    this.limit = limit;
  }

  next() {
    if (this.count <= this.limit) {
      return { done: false, value: this.count++ };
    } else {
      return { done: true, value: undefined };
    }
  }

  [Symbol.iterator]() {
    return this;
  }
}

const c1 = new Counter(3);

for (let i of c1) {
  console.log('first', i);
}
for (let i of c1) {
  console.log('second', i);
}
