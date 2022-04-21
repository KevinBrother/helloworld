const EventEmitter = require('events').EventEmitter;

class StudyEventEmitter extends EventEmitter {
  constructor() {
    super();

    setInterval(() => {
      this.emit('起来学习啦！', Math.random() * 100);
    }, 3000);
  }
}

const studyEventEmitter = new StudyEventEmitter();

studyEventEmitter.addListener('起来学习啦！', (msg) => {
  if (msg < 60) {
    console.log('好的！！');
  } else {
    console.log('我成绩很好，不要学习！');
  }
});
