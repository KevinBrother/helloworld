import express from "express";
import cookieParser from "cookie-parser";
const app = express();

app.use(cookieParser());

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Authorization,X-API-KEY, Origin, X-Requested-With, Content-Type, Accept, Access-Control-Request-Method"
  );
  res.header(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS, PATCH, PUT, DELETE"
  );
  res.header("Allow", "GET, POST, PATCH, OPTIONS, PUT, DELETE");
  next();
});

app.get("/", (req, res) => {
  res.cookie("name", "John Doe");
  res.send("Hello World!");
});


app.get("/login", (req, res) => {
  console.log('在认证中心登录成功')
  // const redirectUrl = req.query.red_url;
  const redirectUrl = 'http://127.0.0.1:13001/v3/getCode?code=123456';
  // 第 6 步骤
  res.redirect(301, 
    redirectUrl
  );
});

app.get("/sso/authorize/code", (req, res) => {
  // const redirectUrl = req.query.red_url;
  const redirectUrl = 'http://127.0.0.1:51732/#/login';
  // 第 5 步骤
  res.redirect(
    301,
    redirectUrl
  );
});

app.get("/sso/api/getToken", (req, res) => {
  const code = req.query.code;
  console.log('获取到code', code)
  res.json({
    access_token: "accesstoken_1",
    id_token: "idtoken_2"
  }) 
})

app.get("/sso/api/getUserInfo", (req, res) => {
  const {access_token, id_token} = req.query;
  console.log('获取到参数', access_token, id_token)
  res.json({
    name: "张三",
    age: "18"
  })
})

app.get("/redirect-second", (req, res) => {
  // res.redirect(
  //   "http://127.0.0.1:5500/node-server/packages/express/11.redirect/login.html#asdfasdf?code=121323"
  // );

  res.json({ name: 'John', age: 30 });
});

app.listen(13002, () => {
  console.log("Server is running on port 3000, visit http://localhost:13002/");
});
