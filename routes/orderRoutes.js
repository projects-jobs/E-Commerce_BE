const { Router } = require("express");
const r = Router();
const c = require("../controller/Ordercontroller");
const { protect, admin } = require("../middleware/Auth");

r.post("/razorpay",   protect,       c.createRazorpayOrder);
r.post("/verify",     protect,       c.verifyPayment);
r.get("/my",          protect,       c.getMyOrders);
r.get("/stats",       protect, admin, c.adminStats);
r.get("/",            protect, admin, c.adminGetOrders);
r.get("/:id",         protect,       c.getOrder);
r.put("/:id/status",  protect, admin, c.updateOrderStatus);

module.exports = r;