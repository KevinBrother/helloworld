import http from "http";
import fs from "fs";

http
  .createServer((req, res) => {
    console.log("Request received, req.url is:", req.url);

    if (req.url === "/") {
      // 重定向到 /index.html
      res.statusCode = 302;
      res.setHeader("Location", "/index.html");
      res.end();
    } else if (req.url === "/index.html") {
      res.statusCode = 200;
      res.setHeader("Content-Type", "text/html");
      let html = fs.readFileSync("./index.html", "utf8");
      res.end(html);
    } else if (req.url === "/submit" && req.method === "POST") {
      // 处理提交表单
      let body = '';
      req.on("data", (data) => {
        body += data;
      });
      req.on("end", () => {
        const formData = new URLSearchParams(body);
        const {name, message}
          = Object.fromEntries(formData.entries());
        res.statusCode = 302;
        res.setHeader("Location", `/submit-origin?name=${name}&message=${message}`);
        res.end();
      });
    } else if (req.url.includes(`/submit-origin`)) {
      // 处理提交表单
      res.statusCode = 200;
      const {name, message} = req.url.split("?")[1].split("&").reduce((acc, cur) => {
        const [key, value] = cur.split("=");
        acc[key] = value;
        return acc;
      }, {});
      res.setHeader("Content-Type", "text/html");
      res.end(`<h1>name= ${name} </br> message= ${message}</h1>`);
    } else {
      res.statusCode = 404;
      res.setHeader("Content-Type", "html");
      res.end("<h1>Not found<h1>");
    }

    // 静态服务器
  })
  .listen(3000, () => {
    console.log("Server running at http://localhost:3000/");
  });
