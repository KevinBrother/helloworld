const mongoose = require("mongoose");
const uri = "mongodb://admin:admin@localhost:27017/bilibili?authSource=admin";

mongoose
  .connect(uri)
  .then((rst) => {
    const User = mongoose.model(
      "users",
      new mongoose.Schema({
        name: String,
        age: Number,
      })
    );

    User.find().then((users) => {
      console.log("users", users);
    });
  })
  .catch((err) => {
    console.log("🚀 ~ mongoose.connect ~ err:", err);
  });
