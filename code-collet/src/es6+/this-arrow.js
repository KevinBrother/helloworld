const name = 'outer';
const obj = {
  name: 'lf',
  say: () => {
    console.log(this.name);
  }
};
obj.say();

const obj2 = {
  name: 'lf',
  say: (function () {
    return () => {
      console.log(this.name);
    };
  })()
};
obj2.say();

const obj3 = {
  name: 'lf',
  say: function () {
    setTimeout(() => {
      console.log(this.name);
    }, 1000);
  }
};
obj3.say();

const obj3Say = obj3.say;
obj3Say();
