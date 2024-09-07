const UserDto = require("../dtos/UserDto");
const Refresh = require("../models/Refresh");
const User = require("../models/User");
const mailSender = require("../utils/mailSender");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
require("dotenv").config();

exports.sendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(404).json({
        success: false,
        message: "All field are required",
      });
    }
    const otp = crypto.randomInt(1000, 9999);
    const ttl = 1000 * 60 * 5;
    const expires = Date.now() + ttl;
    const data = `${email}.${otp}.${expires}`;
    const hash = crypto
      .createHmac("sha256", process.env.HASH_SECRET)
      .update(JSON.stringify(data))
      .digest("hex");

    await mailSender(email, "Verification mail", otp);
    return res.status(200).json({
      success: true,
      message: "Otp sent successfully",
      hash: `${hash}.${expires}`,
      email,
      otp
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.verifyOtp = async (req, res) => {
  try {
    const { otp, hash, email } = req.body;
    if (!otp || !hash || !email) {
      res.status(400).json({ message: "All fields are required!" });
    }

    const [hashedOtp, expires] = hash.split(".");
    if (Date.now() > +expires) {
      res.status(400).json({ message: "OTP expired!" });
    }

    const data = `${email}.${otp}.${expires}`;
    let computedHash = crypto
      .createHmac("sha256", process.env.HASH_SECRET)
      .update(JSON.stringify(data))
      .digest("hex");
    if (hashedOtp !== computedHash) {
      res.status(400).json({ message: "Invalid OTP" });
    }

    let user;
    try {
      user = await User.findOne({ email });
      if (!user) {
        user = await User.create({ email: email });
      }
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
    const payload = {
      _id: user._id,
      activated: false,
    };
    const accessToken = jwt.sign(payload, process.env.ACCESS_SECRET, {
      expiresIn: "1h",
    });
    const refreshToken = jwt.sign(payload, process.env.REFRESH_SECRET, {
      expiresIn: "1y",
    });

    // try {
    //   await Refresh.create({
    //     token: refreshToken,
    //     userId: user._id,
    //   });
    // } catch (error) {
    //   return res.status(500).json({
    //     success: false,
    //     message: error.message,
    //     error: "Error in storing refresh token",
    //   });
    // }
    // res.cookie("token", token, options).status(200).json({
    //   success: true,
    //   token,
    //   existingUser2,
    //   message: "User logged in successfully",
    // });
    res.cookie("refreshToken", refreshToken, {
      maxAge: 1000 * 60 * 60 * 24 * 30,
      httpOnly: true,
    });

    res.cookie("accessToken", accessToken, {
      maxAge: 1000 * 60 * 60 * 24 * 30,
      httpOnly: true,
    });
    //console.log("Setting token", accessToken);

    return res.status(200).json({
      success: true,
      message: "user created successfully",
      user : new UserDto(user),

      auth: true,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
      error: "Error in verifying otp",
    });
  }
};

exports.refresh = async (req, res) => {
  try {
    const { refreshToken: refreshTokenFromCookie } = req.cookies;
    
    if (!refreshTokenFromCookie) {

      return res.status(401).json({ message: "Refresh token not found in cookies",cookie:req.cookies});
    }
    // check if token is valid
    let userData;
    try {
      userData = jwt.verify(refreshTokenFromCookie, process.env.REFRESH_SECRET);
      //console.log("userdata ",userData);
      
    } catch (err) {
      return res.status(401).json({ message: "Invalid Token while verifying" });
    }
    // Check if token is in db
    // try {
    //   const tokenRecord = await Refresh.findOne({
    //     // token: refreshTokenFromCookie,
    //     userId: userData._id,
    //   }).sort({ createdAt: -1 });
    //   //console.log(`refreshToken from db`,tokenRecord,`\nrefresh token`,refreshTokenFromCookie);
    //   if (!tokenRecord) {
    //     return res.status(401).json({ message: "Invalid token from db" });
    //   }
    // } catch (err) {
    //   return res.status(500).json({ message: "Internal error" });
    // }
    // check if valid user
    const user = await User.findOne({ _id: userData._id });
    if (!user) {
      return res.status(404).json({ message: "No user" });
    }
    // Generate new tokens
    const payload = {
      _id: userData._id,
    };
    const accessToken = jwt.sign(payload, process.env.ACCESS_SECRET, {
      expiresIn: "1h",
    });
    const refreshToken = jwt.sign(payload, process.env.REFRESH_SECRET, {
      expiresIn: "1y",
    });

    // Update refresh token
    // try {
    //   await Refresh.findOneAndUpdate(
    //     { _id: userData._id },
    //     { token: refreshToken }
    //   );
    // } catch (err) {
    //   return res.status(500).json({ message: "Internal error" });
    // }
    // put in cookie
    res.cookie("refreshToken", refreshToken, {
      maxAge: 1000 * 60 * 60 * 24 * 30,
      httpOnly: true,
    });

    res.cookie("accessToken", accessToken, {
      maxAge: 1000 * 60 * 60 * 24 * 30,
      httpOnly: true,
    });
    // response
    res.json({ user: new UserDto(user), auth: true });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
      error: "Error in refresh generation",
    });
  }
};

exports.logout = async (req, res) => {
  try {
    const { refreshToken } = req.cookies;
    // delete refresh token from db
    await Refresh.deleteOne({token:refreshToken});
    // delete cookies
    res.clearCookie("refreshToken");
    res.clearCookie("accessToken");
    res.json({ user: null, auth: false });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
      error: "Error in logging out",
    });
  }
};
