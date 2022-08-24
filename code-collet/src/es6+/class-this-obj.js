var name = 'window的';
class Outer {
  obj = {
    name: 'obj',
    getObjName: function () {
      return this.name;
    }
  };

  constructor() {
    this.name = 'outer';
    this.innerObj = new Inner({ outer: this, getName: this.getName });
  }

  getName() {
    return this.name;
  }
}
console.log('[  outer.obj.getObjName ] >', outer.obj.getObjName());
console.log('[ outer ] >', outer.innerObj.getInnerName());
console.log('[ outer ] >', outer.innerObj.outer.innerObj.getInnerName());
