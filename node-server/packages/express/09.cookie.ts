import express from "express";
import cookieParser from "cookie-parser";
const app = express();

app.use(cookieParser());

app.get("/", (req, res) => {
  res.cookie("name", "John Doe");
  res.send("Hello World!");
});

app.get("/get-cookie", (req, res) => {
  // cookie-parser 解析出来的 req.headers.cookie 对象，是以键值对的形式存储的

  const cookies: { [key: string]: string } = {};
  req.
  headers.cookie?.split(";").forEach((item) => {
    const [key, value] = item.split("=");
    cookies[key] = decodeURI(value);
  });
  res.send(`Your name is ${cookies["name"]}`);
});

app.get("/get-cookie/cookie-parser", (req, res) => {
  // cookie-parser 解析出来的 req.headers.cookie 对象，是以键值对的形式存储的
  const name = req.cookies.name;
  res.send(`Your name is ${name}`);
});

app.listen(3000, () => {
  console.log("Server is running on port 3000, visit http://localhost:3000/");
});
