const mongoose = require("mongoose");
const uri = "mongodb://admin:admin@localhost:27017/bilibili?authSource=admin";
const UserSchema = new mongoose.Schema({
  name: String,
  date: {
    type: String,
    required: true
  },
  type: {
    type: Number,
    enum: [1, -1],
    required: true
  },
  amount: Number,
  desc: String
});
function connect(handlerSuccess, handlerError) {
  try {
    mongoose.connect(uri);

    const User = mongoose.model(
      "users",
      UserSchema
    );

    handlerSuccess({ User });
  } catch (err) {
    handlerError(err);
  }
}

connect(
  ({ User }) => {
    User.find().then((users) => {
      console.log("find", users);
    });

    User.create({ name: "John", date: new Date().toISOString(), type: 1, amount: 100, desc: "test" }).then((user) => {
      console.log("create", user);
    });

    User.updateOne({ name: "John" }, { $set: { age: 31 } }).then((user) => {
      console.log("update", user);
    });

    User.findOne({ name: "John" }).then((user) => {
      console.log("findOne", user);
    });

    setTimeout(() => {
      User.deleteOne({ name: "John" }).then((user) => {
        console.log("delete", user);
      });
    }, 2000);
  },
  (err) => {
    console.log(err);
  }
);

module.exports = { connect };
