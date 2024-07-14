const mongoose = require("mongoose");

let origin = "http://localhost:5000";
console.log("server env", process.env.NODE_ENV);
if (process.env.NODE_ENV === "production") {
origin = process.env.BASE_URL;
}
else if(process.env.NODE_ENV === "development"){
  origin = origin;
}
const userSchema = new mongoose.Schema(
  {
    name: { type: String },
    avatar: {
      type: String,
      get: (avatar) => {
        if (avatar) {
          return `${origin}${avatar}`;
        }
        return avatar;
      },
    },
    email: {
      type: String,
      required: true,
    },
    activated: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON :{getters:true}
  }
);
module.exports = mongoose.model("User", userSchema);
