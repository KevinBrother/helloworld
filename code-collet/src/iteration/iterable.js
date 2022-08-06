//1.  最简单的计数循环
/* for (let i = 0; i < 10; ++i) {
  console.log('[ i ] >', i);
} */

// 可迭代对象不一定是集合对象，比如上面的循环，
// 该循环中生成的值是暂时性的，但循环本身是在执行迭代。计数循环和数组都具有可迭代对象的行为。
// 临时性可迭代对象可以实现为生成器

/* // 2. 演示迭代器与可迭代对象
let arr = ['foo', 'bar'];
// 迭代器工厂函数
console.log(arr[Symbol.iterator]);
// 迭代器
let iter = arr[Symbol.iterator]();
console.log(iter);
// 执行迭代
console.log(iter.next());
console.log(iter.next());
console.log(iter.next()); */

// 3. 实现可迭代接口（Iterable）
class Foo {
  [Symbol.iterator]() {
    return {
      next() {
        return { done: false, value: 'foo' };
      }
    };
  }
}

let f = new Foo();
let fIter = f[Symbol.iterator]();
console.log('[ fIter, fIter.next() ] >', fIter, fIter.next());
console.log('[ fIter, fIter.next() ] >', fIter, fIter.next());
let arr = new Array();
let arrIter = arr[Symbol.iterator]();
console.log('[ arr ] >', arrIter, arrIter.next());
