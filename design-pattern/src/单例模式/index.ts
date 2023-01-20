class Singleton {
  private static singleton: Singleton;

  private constructor() {}

  static getInstance() {
    if (!Singleton.singleton) {
      Singleton.singleton = new Singleton();
    }

    return Singleton.singleton;
  }

  log() {
    return 'log';
  }
}

const s1 = Singleton.getInstance();
const s2 = Singleton.getInstance();
console.log('%c [ s1 ]-20', 'font-size:13px; background:pink; color:#bf2c9f;', s1 === s2, s1.log());
