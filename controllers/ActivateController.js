const Jimp = require("jimp");
const path = require("path");
const User = require("../models/User");
const UserDto = require("../dtos/UserDto");

exports.activate = async (req, res) => {
  try {
    const { name, avatar } = req.body;
    if (!name || !avatar) {
      res.status(400).json({ message: "All fields are required!" });
    }

    // Image Base64
    const buffer = Buffer.from(
      avatar.replace(/^data:image\/(png|jpg|jpeg);base64,/, ""),
      "base64"
    );
    const imagePath = `${Date.now()}-${Math.round(Math.random() * 1e9)}.png`;
    // 32478362874-3242342342343432.png

    try {
      const jimResp = await Jimp.read(buffer);
      jimResp
        .resize(150, Jimp.AUTO)
        .write(path.resolve(__dirname, `../storage/${imagePath}`));
    } catch (err) {
      res.status(500).json({ message: "Could not process the image" });
    }

    const userId = req.user._id;
    // Update user
    try {
      const user = await User.findOneAndUpdate(
        { _id: userId },
        {
          activated: true,
          name: name, 
          avatar: `/storage/${imagePath}`,
        },
        { new: true }
      );
      res.json({ user: new UserDto(user), auth: true });
    } catch (err) {
      res.status(500).json({ message: "Something went wrong!" });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "error in activate controller",
      error: error.message,
    });
  }
};
