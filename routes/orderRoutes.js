const express = require("express");
const router = express.Router();
const { createRazorpayOrder, verifyPayment, getMyOrders, getOrder, adminGetOrders, updateOrderStatus, adminStats } = require("../controller/Ordercontroller");
const { protect, admin } = require("../middleware/Auth");

router.post("/create-razorpay-order", protect, createRazorpayOrder);
router.post("/verify-payment", protect, verifyPayment);
router.get("/my", protect, getMyOrders);
router.get("/stats", protect, admin, adminStats);
router.get("/all", protect, admin, adminGetOrders);
router.get("/:id", protect, getOrder);
router.put("/:id/status", protect, admin, updateOrderStatus);

module.exports = router;