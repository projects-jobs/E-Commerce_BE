const { Router } = require("express");
const r = Router();
const c = require("../controller/Admincontroller");
const { protect, admin } = require("../middleware/Auth");
r.use(protect, admin);
r.route("/users").get(c.getAllUsers);
r.route("/users/:id").get(c.getUser).put(c.updateUser).delete(c.deleteUser);
module.exports = r;