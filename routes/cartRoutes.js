const { Router } = require("express");
const r = Router();
const c = require("../controller/Cartcontroller");
const { protect } = require("../middleware/Auth");

r.use(protect);
r.route("/").get(c.getCart).delete(c.clearCart);
r.route("/add").post(c.addToCart);
r.route("/:productId").put(c.updateCart).delete(c.removeFromCart);

module.exports = r;