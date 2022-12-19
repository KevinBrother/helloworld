// 存储messagePort
let messagePort = null;
let contextIdentifier = null;

function addContextAndSend(data, destination) { 
    data.push(contextIdentifier);
    destination.postMessage(data);
}

// 消息处理的监听
self.onmessage =  ({data, ports}) => {

    if(ports.length) {
        contextIdentifier = data;
        messagePort = ports[0];
        messagePort.onmessage = ({data}) => {
            addContextAndSend(data, self)
        };
    }else {
        addContextAndSend(data, messagePort);
    }
};