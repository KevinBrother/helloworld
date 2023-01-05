@ad
class User {
  name = '章三';

  // @change
  gender = 'Male';
}

function ad(target) {
  target.age = 18;
  target.name = '里斯';
  // 加不加 return 有很大区别
  return target;
}

function change(target, name, descriptor) {
  descriptor.value = 'Female';
  return descriptor;
}

const user = new User();
console.log('%c [ user ]-12', 'font-size:13px; background:pink; color:#bf2c9f;', user);
