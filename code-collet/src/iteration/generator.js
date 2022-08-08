/* 
// demo1
function* generatorFn() {}

let generatorObject = generatorFn();
console.log(
  '%c [ generatorObject ]-4',
  'font-size:13px; background:pink; color:#bf2c9f;',
  generatorObject,
  generatorObject.next()
);
 */

/* 
// demo2
function* generatorFn() {
  yield 1;
  yield 2;
  yield 3;
}

let gObj = generatorFn();
console.log(gObj.next());
console.log(gObj.next());
console.log(gObj.next());
console.log(gObj.next());
 */

/* // demo3
function* count(n) {
  while (n--) {
    yield;
  }
}

for (let _ of count(3)) {
  console.log('good!');
} 
*/

/* // TODO demo4 不理解bar的输出去哪里呢？
function* inAntOut(initial) {
  console.log('[ value ] >', initial);
  console.log(yield);
  console.log(yield);
}

let gObj = inAntOut('foo');
gObj.next('bar');
gObj.next('baz');
gObj.next('qux');
 */

/* // demo5
function* generatorFn() {
  console.log(yield* [1, 2, 3]);
}
for (const x of generatorFn()) {
  console.log(x);
}
 */

/* // demo6
// 在有return语句时，则需要用var value = yield* iterator的形式获取return语句的值。
function* innerGenerateFn() {
  yield 'foo';
  return 'bar';
}

function* outerGenerateFn() {
  console.log('[ value outer ] >', yield* innerGenerateFn());
}

for (const x of outerGenerateFn()) {
  console.log('[ value of] >', x);
}
 */

// demo7
/* function* nTime(n) {
  if (n > 0) {
    yield* nTime(n - 1);
    yield n - 1;
  }
}

for (const x of nTime(2)) {
  console.log(x);
}
 */
