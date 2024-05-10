const mongoose = require("mongoose");
const uri = "mongodb://admin:admin@localhost:27017/bilibili?authSource=admin";

async function connect() {
  mongoose.connect(uri);

  const User = mongoose.model(
    "users",
    new mongoose.Schema({
      name: String,
      age: Number,
    })
  );

  return { User };
}

connect().then(({ User }) => {
  User.find().then((users) => {
    console.log("users", users);
  });
});
