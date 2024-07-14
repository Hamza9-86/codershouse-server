const RoomDto = require("../dtos/RoomDto");
const Room = require("../models/Room");

exports.create = async (req, res) => {
  try {
    const { topic, roomType } = req.body;

    if (!topic || !roomType) {
      return res.status(400).json({ message: "All fields are required!" });
    }

    const room = await Room.create({
      topic,
      roomType,
      ownerId: req.user._id,
      speakers: [req.user._id],
    });

    return res.json(new RoomDto(room));
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `error while creating room`,
      error: error.message,
    });
  }
};

exports.index = async (req, res) => {
  try {
    const rooms = await Room.find({ roomType: { $in: ["open"] } })
      .populate("speakers")
      .populate("ownerId")
      .exec();
    const allRooms = rooms.map((room) => new RoomDto(room));
    return res.json(allRooms);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `error while indexing room`,
      error: error.message,
    });
  }
};

exports.show = async (req, res) => {
  try {
    const room = await Room.findOne({ _id: req.params.roomId });

    return res.json(room);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `error while showing room`,
      error: error.message,
    });
  }
};
