import express from "express";

const app = express();


app.use(function (req, res, next) {
  const referer = req.get("referer");

  if (referer) {
    const { hostname } = new URL(referer);

    if (hostname !== "localhost") {
      res.status(403).send("<h1>Forbidden<h1>");
      return;
    }
  }
  next();
});

app.use(express.static("./public"));

app.listen(3000, () => {
  console.log("Server is running on port 3000 http://localhost:3000");
});
