import express from "express";
import { homeRouter } from "./homeRouter";
import { adminRouter } from "./adminRouter";

const app = express();

app.use(homeRouter);
app.use(adminRouter);

app.listen(3000, () => {
  console.log("Server is running on port 3000 http://localhost:3000");
});
