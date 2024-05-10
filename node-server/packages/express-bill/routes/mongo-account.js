var express = require("express");
var router = express.Router();
const shortid = require("shortid");
const { connect } = require("../utils/mongodb");


/* GET home page. */
connect(
  ({ User }) => {
    router.get("/form", function (req, res, next) {
      res.render("form");
    });

    router.post("/add", function (req, res, next) {
      const id = shortid.generate();
      const { name, date, type, amount, desc } = req.body;
      User.create({ id, name, date, type, amount, desc }).then((user) => {
        res.render("tip", { tip: "添加成功", success: true });
      }).catch(err =>{
        res.render("tip", { tip: "添加失败", success: false });
      });
    });

    router.get("/", function (req, res, next) {
      User.find().then((users) => {
        res.render("list", {
          title: "Express",
          accounts: users,
        });
      }).catch(err => {
        res.render("tip", { tip: "获取数据失败", success: false });
      });
    });

    router.get("/remove/:id", function (req, res, next) {
      const { id } = req.params;

      User.deleteOne({ id }).then(() => {
        res.render("tip", { tip: "删除成功", success: true });
      }).catch(err => {
        res.render("tip", { tip: "删除失败", success: false  });
      });
    });
  },
  (err) => {
    console.log("🚀 ~ connect ~ err:", err);
  }
);
module.exports = router;
