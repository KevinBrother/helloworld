function getRandomIntInclusive(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min; //含最大值，含最小值
}

class Emperor {
  name: string;
  constructor(name: string) {
    this.name = name;
  }
  say() {
    console.log(this.name);
  }
}

export class EmperorPool {
  // 明朝的两个皇帝
  private static maxEmperot = 2;
  private static emperorList: Emperor[] = [];

  static {
    let max = this.maxEmperot;
    for (let i = 1; i <= max; i++) {
      this.emperorList.push(new Emperor(`第${i}个皇帝`));
    }
  }

  static getInstance() {
    const random = getRandomIntInclusive(0, 1);
    return this.emperorList[random];
  }
}

const number = 5;
for (let i = 0; i < number; i++) {
  const emperor = EmperorPool.getInstance();
  emperor.say();
}
