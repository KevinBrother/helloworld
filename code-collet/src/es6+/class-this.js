var name = 'window的';
class Outer {
  obj = {
    name: 'obj',
    getObjName: function () {
      return this.name;
    },

    getArrowObj: () => {
      // console.log('[ getArrowObj this ] >', this);
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

class Inner {
  constructor(props) {
    this.name = 'inner';
    this.getInnerName = props.getName;
    this.outer = props.outer;
  }
}
const outer = new Outer();

console.log('[ outer ] >', outer);
console.log('[ outer ] >', outer.getName());
console.log('[  outer.obj.getObjName ] >', outer.obj.getObjName());
console.log('[  outer.obj.getArrowObj ] >', outer.obj.getArrowObj());
console.log('[ outer ] >', outer.innerObj.getInnerName());
console.log('[ outer ] >', outer.innerObj.outer.innerObj.getInnerName());
