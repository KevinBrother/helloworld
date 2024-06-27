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

app.get("/redirect", (req, res) => {
  res.redirect(
    "http://127.0.0.1:13000/redirect-second?red_url=http://127.0.0.1:5500/node-server/packages/express/11.redirect/login.html/#/asdfasdf"
  );
});

app.get("/redirect-second", (req, res) => {
  // res.redirect(
  //   "http://127.0.0.1:5500/node-server/packages/express/11.redirect/login.html#asdfasdf?code=121323"
  // );

  res.json({ name: 'John', age: 30 });
});

app.listen(13000, () => {
  console.log("Server is running on port 3000, visit http://localhost:13000/");
});
