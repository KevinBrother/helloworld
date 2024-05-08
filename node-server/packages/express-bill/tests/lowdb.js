const { shortid, db } = require("../utils/lowdb");
const id = shortid.generate();
// 增
db.get("account").unshift({ id, name: "张三", age: 12 }).write();

// 查
console.log(db.get("account").find({ id }).value());

// 改
setTimeout(() => {
  db.get("account").find({ id }).assign({ age: 13 }).write();
}, 1000);

// 删
setTimeout(() => {
  db.get("account").remove({ id }).write();
}, 2000);
