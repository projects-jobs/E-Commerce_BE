const express = require("express");
const router = express.Router();
const { getCart, addToCart, updateCart, removeFromCart, clearCart } = require("../controller/Cartcontroller");
const { protect } = require("../middleware/Auth");

router.use(protect);
router.get("/", getCart);
router.post("/", addToCart);
router.delete("/", clearCart);
router.put("/:productId", updateCart);
router.delete("/:productId", removeFromCart);

module.exports = router;