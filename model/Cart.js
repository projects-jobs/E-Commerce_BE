const mongoose = require("mongoose");

// ── CART ──────────────────────────────────────────────────────────────────
const cartSchema = new mongoose.Schema({
  user:  { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  items: [{
    product:  { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    quantity: { type: Number, default: 1, min: 1 },
  }],
}, { timestamps: true });

// ── ORDER ─────────────────────────────────────────────────────────────────
const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  items: [{
    product:  { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    name:     String,
    image:    String,
    price:    Number,
    quantity: { type: Number, min: 1 },
  }],
  shippingAddress: {
    street:  { type: String, required: true },
    city:    { type: String, required: true },
    state:   { type: String, required: true },
    pincode: { type: String, required: true },
    country: { type: String, default: "India" },
  },
  paymentInfo: {
    razorpay_order_id:   String,
    razorpay_payment_id: String,
    razorpay_signature:  String,
    method:              { type: String, default: "razorpay" },
  },
  itemsPrice:    { type: Number, required: true },
  taxPrice:      { type: Number, default: 0 },
  shippingPrice: { type: Number, default: 0 },
  totalPrice:    { type: Number, required: true },
  orderStatus:   { type: String, enum: ["Pending","Processing","Shipped","Delivered","Cancelled"], default: "Pending" },
  isPaid:        { type: Boolean, default: false },
  paidAt:        Date,
  deliveredAt:   Date,
  statusHistory: [{ status: String, updatedAt: { type: Date, default: Date.now }, note: String }],
}, { timestamps: true });

const Cart  = mongoose.model("Cart",  cartSchema);
const Order = mongoose.model("Order", orderSchema);

module.exports = { Cart, Order };