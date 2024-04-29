import { Router } from "express";

const homeRouter = Router();

homeRouter.get("/home", (req, res) => {
  res.send("Hello home!");
});

export { homeRouter };
