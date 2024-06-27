import express from "express";
import cookieParser from "cookie-parser";
const app = express();

app.use(cookieParser());

app.get("/", (req, res) => {
  res.cookie("name", "John Doe");
  res.send("Hello World!");
});

app.get("/redirect", (req, res) => {
  res.redirect("http://127.0.0.1:13000/redirect-second?red_url=http://127.0.0.1:5500/node-server/packages/express/11.redirect/#/asdfasdf");
});


app.get("/redirect-second", (req, res) => {
  res.redirect("http://127.0.0.1:5500/node-server/packages/express/11.redirect/#/asdfasdf?code=121323");
});

app.listen(13000, () => {
  console.log("Server is running on port 3000, visit http://localhost:13000/");
});
