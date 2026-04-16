const express = require("express");
const router = express.Router();
// This line must match the filename in the controllers folder exactly
const { register, login, getMe, updateProfile, changePassword } = require("../controller/Authcontroller");
const { protect } = require("../middleware/Auth");

router.post("/register", register);
router.post("/login", login);
router.get("/me", protect, getMe);
router.put("/update-profile", protect, updateProfile);
router.put("/change-password", protect, changePassword);

module.exports = router;