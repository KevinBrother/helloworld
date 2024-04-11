// 代理 HTTP 请求方法
import http  from "http"; // Node.js自带的 http 模块
import axios  from 'axios';
axios.defaults.timeout = 15000;

const url = 'http://example.com'

function onRequest(request, response) {
    console.log("Request received.");
    // 配置代理服务器信息
    const proxy = {
        host: "127.0.0.1", //代理服务器地址
        port: 17890 // 代理服务器端口
    };
    // https://github.com/axios/axios#request-config
    axios.get(url,{proxy})
    // axios.get(url)
        .then((res) => {
            console.log('res: ', res.data)
            // 当收到请求时，使用 response.writeHead() 函数发送一个HTTP状态200和HTTP头的内容类型（content-type）
            response.writeHead(200, {"Content-Type": "text/plain"});
            // 使用 response.write() 函数在HTTP相应主体中发送文本“Hello World"。
            response.write("Hello World \n");
            response.write(res.data);
            // 最后，我们调用 response.end() 完成响应。
            response.end();
        })
        .catch((error) => {
            // console.log(error)
            console.log(error.toJSON())
            // 当收到请求时，使用 response.writeHead() 函数发送一个HTTP状态200和HTTP头的内容类型（content-type）
            response.writeHead(200, {"Content-Type": "text/plain"});
            // 使用 response.write() 函数在HTTP相应主体中发送文本“Hello World"。
            response.write("error");
            // 最后，我们调用 response.end() 完成响应。
            response.end();
        })
}

http.createServer(onRequest).listen(8888, () => {
    console.log("Server running at http://localhost:8888");
});
