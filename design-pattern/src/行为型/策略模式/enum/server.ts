interface ICalculator {
  add: (a: number, b: number) => number;
  sub: (a: number, b: number) => number;
}

export const Calculator: ICalculator = {
  add: (a: number, b: number) => {
    return a + b;
  },
  sub: (a: number, b: number) => {
    return a - b;
  }
};

/* 
// ts的枚举值知识是数字或字符串
enum A {
  add = {
    a: 1
  }
}
 */
