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

// demo4 不理解bar的输出去哪里呢？
function* inAntOut(initial) {
  console.log('[ value ] >', initial);
  console.log(yield);
  console.log(yield);
}

let gObj = inAntOut('foo');
gObj.next('bar');
gObj.next('baz');
gObj.next('qux');
