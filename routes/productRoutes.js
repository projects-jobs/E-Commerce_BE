const express = require("express");
const router = express.Router();
const { getProducts, getProduct, createProduct, updateProduct, deleteProduct, addReview, adminGetProducts } = require("../controller/Productcontroller");
const { protect, admin } = require("../middleware/Auth");

router.get("/", getProducts);
router.get("/admin/all", protect, admin, adminGetProducts);
router.get("/:id", getProduct);
router.post("/", protect, admin, createProduct);
router.put("/:id", protect, admin, updateProduct);
router.delete("/:id", protect, admin, deleteProduct);
router.post("/:id/review", protect, addReview);

module.exports = router;