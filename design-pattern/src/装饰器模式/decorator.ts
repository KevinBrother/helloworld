export function readonly(target, name, descriptor) {
  // descriptor对象原来的值如下
  // {
  //   value: specifiedFunction,
  //   enumerable: false,
  //   configurable: true,
  //   writable: true
  // };
  descriptor.writable = false;
  descriptor.value = () => 'modified by decorator';
  return descriptor;
}
// readonly(Person.prototype, 'name', descriptor);
// 类似于
// Object.defineProperty(Person.prototype, 'name', descriptor);
