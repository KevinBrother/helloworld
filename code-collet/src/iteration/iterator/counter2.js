// 用闭包解决计数器变量问题
class Counter {
  constructor(limit) {
    this.limit = limit;
  }

  [Symbol.iterator]() {
    let count = 1;
    let limit = this.limit;
    return {
      next() {
        if (count <= limit) {
          return { done: false, value: count++ };
        } else {
          return { done: true, value: undefined };
        }
      }
    };
  }
}

const c1 = new Counter(3);

for (let i of c1) {
  console.log('first', i);
}
for (let i of c1) {
  console.log('second', i);
}
