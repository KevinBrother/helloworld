function getRandomIntInclusive(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min; //含最大值，含最小值
}

// 明朝的两个皇帝
export class Emperor {
  private static maxEmperot = 2;
  private static nameList: string[] = [];
  private static emperorList: Emperor[] = [];
  private static currentCount = 0;

  private constructor(name: string) {
    Emperor.nameList.push(name);
  }

  static {
    let max = this.maxEmperot;
    for (let i = 1; i <= max; max--) {
      this.emperorList.push(new Emperor(`第${i}个皇帝`));
    }
  }

  static getInstance() {
    this.currentCount = getRandomIntInclusive(0, 1);
    return this.emperorList[this.currentCount];
  }

  static say() {
    console.log(this.nameList[this.currentCount]);
  }
}

const s1 = Emperor.getInstance();
const s2 = Emperor.getInstance();

const number = 5;
for (let i = 0; i < number; i++) {
  const emperor = Emperor.getInstance();
  emperor.say();
}
