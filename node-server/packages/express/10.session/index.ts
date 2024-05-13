import express from "express";
import session from "express-session";
import MongoDBStoreFn from "connect-mongodb-session";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import path from "path";
const app = express();
const viewsPath = path.resolve(__dirname, "./views"); // 获取views目录的绝对路径

// 设置模板引擎
app.set("view engine", "ejs");
// 设置views目录
app.set("views", viewsPath);
app.use(cookieParser());

const MongodbStore = MongoDBStoreFn(session);

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));

// parse application/json
app.use(bodyParser.json());

const store = new MongodbStore({
  uri: "mongodb://admin:admin@localhost:27017/bilibili?authSource=admin",
  collection: "sessions",
});

// Catch errors
store.on("error", function (error) {
  console.log(error);
});
const maxAge = 1000 * 60 * 60 * 24 * 7; // 7 days
// const maxAge = 1000 * 10; // 10 seconds
const identityKey = "skey";

app.use(
  session({
    name: identityKey,
    secret: "admin", // 用来对session id相关的cookie进行签名
    store: store, // 本地存储session（文本文件，也可以选择其他store，比如redis的）
    saveUninitialized: false, // 是否自动保存未初始化的会话，建议false
    resave: false, // 是否每次都重新保存会话，建议false
    cookie: {
      maxAge, // 有效期，单位是毫秒
    },
  })
);

app.get("/", (req, res) => {
  // @ts-ignore
  var loginUser = req.session.loginUser;
  var isLogined = !!loginUser;

  res.render("index", {
    isLogined,
    name: loginUser || "",
  });
});

// 登录接口
// 登录：如果用户存在，则通过req.regenerate创建session，保存到本地，并通过Set-Cookie将session id保存到用户侧；
app.post("/login", function (req, res, next) {
  const { name, password } = req.body;

  if (name === "admin" && password === "admin") {
    req.session.regenerate(function (err) {
      if (err) {
        return res.json({ ret_code: 2, ret_msg: "登录失败" });
      }
      // @ts-ignore
      req.session.loginUser = name;
      res.cookie("ssid", req.session.id, { maxAge });
      res.json({ ret_code: 0, ret_msg: "登录成功" });
    });
  } else {
    res.json({ ret_code: 1, ret_msg: "账号或密码错误" });
  }
});

app.get("/logout", function (req, res, next) {
  // @ts-ignore
  const client_ssid = req.session.ssid;
  const server_ssid = req.session.id;

  if (client_ssid !== server_ssid) {
    return res.json({ ret_code: 1, ret_msg: "Session 不正确，退出失败" });
  }

  req.session.destroy(function (err) {
    if (err) {
      return res.json({ ret_code: 2, ret_msg: "退出失败" });
    }
    res.clearCookie("ssid");
    res.json({ ret_code: 0, ret_msg: "退出成功" });
  });
});

app.listen(3000, () => {
  console.log("Server is running on port 3000, visit http://localhost:3000/");
});
