// routes/Auth.js
const { Router } = require("express");
const r = Router();
const c = require("../controller/Authcontroller");
const { protect } = require("../middleware/Auth");
r.post("/register", c.register);
r.post("/login",    c.login);
r.get("/me",        protect, c.getMe);
r.put("/update-profile",  protect, c.updateProfile);
r.put("/change-password", protect, c.changePassword);
module.exports = r;