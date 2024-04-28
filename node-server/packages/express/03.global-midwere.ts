import express from "express";

const app = express();

app.use((req, res, next) => {
  console.log("This is a global middleware");
  next();
});

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.get("/abc", (req, res) => {
  res.send("Hello abc!");
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
