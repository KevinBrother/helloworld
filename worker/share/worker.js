const connectList = [], msgList = [];

console.log(self);
self.onconnect = function (w) {
    // 开启
    console.log(w.ports[0]);

    const port = w.ports[0];
    
    port.start();
    // 监听
    port.onmessage = function (e) {
        // console.log('e. data ---', e.data, connectList);
        // console.log('e. connectList ---', connectList);

        const worker = e.currentTarget, data = e.data;
        
        // 加入到列表
        if (connectList.indexOf(worker) === -1) {
            connectList.push(worker);
        }

        // 新用户进入
        if (data.type === "start") {
            connectList.forEach(item => {
                if (item === worker) {
                    // console.log('???', e.data);
                    item.postMessage("你已进入");
                }
                else {
                    item.postMessage("新用户进入");
                }
            });
        }

        //新消息
        if (data.type === "msg") {
            const {userId, value} = data;
            msgList.push("用户 "+ userId + " 说: " + value);
            connectList.forEach(item => {
                item.postMessage(msgList);
            });
        }
    };
};
