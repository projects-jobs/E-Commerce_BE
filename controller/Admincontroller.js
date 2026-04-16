const User = require("../model/User");

// @GET /api/admin/users
const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find({}).select("-password").sort({ createdAt: -1 });
    res.json({ success: true, users });
  } catch (err) { next(err); }
};

// @GET /api/admin/users/:id
const getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, user });
  } catch (err) { next(err); }
};

// @PUT /api/admin/users/:id
const updateUser = async (req, res, next) => {
  try {
    const { name, email, role, isActive } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, { name, email, role, isActive }, { new: true }).select("-password");
    res.json({ success: true, user });
  } catch (err) { next(err); }
};

// @DELETE /api/admin/users/:id
const deleteUser = async (req, res, next) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "User deleted" });
  } catch (err) { next(err); }
};

module.exports = { getAllUsers, getUser, updateUser, deleteUser };