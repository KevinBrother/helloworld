var express = require("express");
var router = express.Router();
const { db, shortid, account } = require("../utils/lowdb");

/* GET home page. */
router.get("/form", function (req, res, next) {
  res.render("form");
});

router.post("/add", function (req, res, next) {
  const { name, date, type, amount, desc } = req.body;
  const id = shortid.generate();
  db.get(account).push({ id, name, date, type, amount, desc }).write();
  res.render("tip", { tip: "添加成功", type: 'add' });
});

router.get("/", function (req, res, next) {
  res.render("list", { title: "Express", accounts: db.get(account).value() });
});

router.get("/remove/:id", function (req, res, next) {
  const { id } = req.params;
  db.get(account).remove({ id }).write();
  res.render("tip", {tip: '删除成功', type: 'remove'});
});

module.exports = router;
