const express = require("express");
const router = express.Router();
const { getAllUsers, getUser, updateUser, deleteUser } = require("../controller/Admincontroller");
const { protect, admin } = require("../middleware/Auth");

// All routes here require the user to be logged in AND be an admin
router.use(protect, admin);

router.route("/")
  .get(getAllUsers);

router.route("/:id")
  .get(getUser)
  .put(updateUser)
  .delete(deleteUser);

module.exports = router;