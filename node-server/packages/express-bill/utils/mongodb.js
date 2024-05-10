const mongoose = require("mongoose");
const uri = "mongodb://admin:admin@localhost:27017/bilibili?authSource=admin";
const UserSchema = new mongoose.Schema({
  id: String,
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
    console.log("🚀 ~ connect ~ User:", User)
    
    handlerSuccess({User});
  } catch (err) {
    handlerError(err);
  }
}

module.exports = { connect, UserSchema };
