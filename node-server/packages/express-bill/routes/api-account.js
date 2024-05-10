var express = require("express");
var router = express.Router();
const shortid = require("shortid");
const { connect } = require("../utils/mongodb");

// 接口文档： https://apifox.com/apidoc/shared-8fe9cad9-3f47-448a-85e7-efcb091f3598

/* GET home page. */
connect(
  ({ User }) => {
    router.post("/add", function (req, res, next) {
      const id = shortid.generate();
      const { name, date, type, amount, desc } = req.body;
      console.log("🚀 ~ req.body:", req.body)
      User.create({ id, name, date, type, amount, desc }).then((user) => {
        res.send({
          code: '0000',
          msg: '添加成功',
          data: user
        })
      }).catch(err =>{
        res.send({
          code: '0001',
          msg: '添加失败',
          data: err
        })
      });
    });

    router.get("/", function (req, res, next) {
      User.find().then((users) => {
        console.log("🚀 ~ User.find ~ users:", users)
        res.send({
          code: '0000',
          msg: '获取成功',
          data: users
        })
      }).catch(err => {
        res.send({
          code: '0001',
          msg: '获取失败',
          data: err
        })
      });
    });

    router.get("/remove/:id", function (req, res, next) {
      const { id } = req.params;

      User.deleteOne({ id }).then(() => {
        res.send({
          code: '0000',
          msg: '删除成功',
          data: null
        })
      }).catch(err => {
        res.send({
          code: '0001',
          msg: '删除失败',
          data: err
        })
      });
    });
  },
  (err) => {
    console.log("🚀 ~ connect ~ err:", err);
  }
);
module.exports = router;
