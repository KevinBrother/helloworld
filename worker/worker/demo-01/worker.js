
console.log('welcome to worker!!!');

// this和self都能用，但是推荐用self
console.log(this);

// 设置当前worker的名字
self.name = '1号打工人';
console.log(self);

setTimeout(function () {
    self.postMessage('来自' + self.name + '的消息');
}, 2000);

throw Error(self.name)

self.onmessage = function(ev) {
    console.log('接到主线程的消息：bbb ', ev, ev.data);
    self.close(); 
};

self.onmessage = function(ev) {
    console.log('接到主线程的消息：zzz ', ev, ev.data);
    self.close(); 
};

self.addEventListener('message', function(ev) {
    console.log('接到主线程的消息 add： ', ev, ev.data);
    self.close(); 
});

self.addEventListener('message', function(ev) {
    console.log('接到主线程的消息 add22： ', ev, ev.data);
    self.close(); 
});

self.addEventListener('close', function(ev) {
    console.log('closed', ev);
})

/* setTimeout(() => {
    self.close(); 
    worker.postMessage('来自' + self.name + '关闭后的消息');
}, 4000); */