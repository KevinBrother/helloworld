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
          return { done: true };
        }
      },
      return() {
        return { done: true };
      }
    };
  }
}

let counter = new Counter(5);

/* // 提前终止迭代器,看不出效果的
try {
  for (let i of counter) {
    if (i > 2) {
      throw 'err';
    }
    console.log('[ i ] >', i);
  }
} catch (e) {}

// 提前终止迭代器,看不出效果的
let counter2 = new Counter(5);
let [a, b] = counter2;
console.log('[ a ,b ] >', a, b);
 */

// 如果没有终止迭代器,则可以继续迭代，获取后面的值
/*  // 为什么自己实现的迭代器，不能再被迭代？因为迭代器不是可迭代对象啊！！！

let iter = counter[Symbol.iterator]();
console.log(
  '%c [ iter ]-45',
  'font-size:13px; background:pink; color:#bf2c9f;',
  iter
);

for (let i of iter) {
  console.log('[ iter ] >', i);
  if (i > 2) {
    break;
  }
}
for (let i of iter) {
  console.log('[ iter ] >', i);
}
 */
// 数组的迭代器不能终止，只能暂停
let arr = [1, 2, 3, 4, 5];

let arrIter = arr[Symbol.iterator]();
console.log(
  '%c [ arrIter ]-65',
  'font-size:13px; background:pink; color:#bf2c9f;',
  arrIter,
  arrIter[Symbol.iterator](),
  arrIter[Symbol.iterator]()[Symbol.iterator]()
);
for (let i of arrIter) {
  console.log('[ arrIter ] >', i);
  if (i > 2) {
    break;
  }
}

console.log('[=========]');

for (let i of arrIter) {
  console.log('[ arrIter ] >', i);
}
