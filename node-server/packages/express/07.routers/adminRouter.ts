import { Router } from "express";

const adminRouter = Router();

adminRouter.get("/admin", (req, res) => {
  res.send("Hello admin!");
});

export { adminRouter };
