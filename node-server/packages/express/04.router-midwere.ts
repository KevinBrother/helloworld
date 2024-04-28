import express, { Request, Response, NextFunction } from "express";

const app = express();

function logger(req: Request, res: Response, next: NextFunction) {
  console.log("Request URL:", req.url);
  next();
}

app.get("/", logger, (req, res) => {
  res.send("Hello World!");
});

app.get("/abc", logger, (req, res) => {
  res.send("Hello abc!");
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
