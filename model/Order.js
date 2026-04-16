const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema({
  product:  { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  name:     String,
  image:    String,
  price:    Number,
  quantity: { type: Number, required: true, min: 1 },
});

const orderSchema = new mongoose.Schema({
  user:    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  items:   [orderItemSchema],
  shippingAddress: {
    street:  { type: String, required: true },
    city:    { type: String, required: true },
    state:   { type: String, required: true },
    pincode: { type: String, required: true },
    country: { type: String, default: "India" },
  },
  paymentInfo: {
    razorpay_order_id:   { type: String },
    razorpay_payment_id: { type: String },
    razorpay_signature:  { type: String },
    method:              { type: String, default: "razorpay" },
  },
  itemsPrice:    { type: Number, required: true },
  taxPrice:      { type: Number, default: 0 },
  shippingPrice: { type: Number, default: 0 },
  totalPrice:    { type: Number, required: true },
  orderStatus:   { type: String, enum: ["Pending","Processing","Shipped","Delivered","Cancelled"], default: "Pending" },
  isPaid:        { type: Boolean, default: false },
  paidAt:        { type: Date },
  deliveredAt:   { type: Date },
  statusHistory: [{
    status:    String,
    updatedAt: { type: Date, default: Date.now },
    note:      String,
  }],
}, { timestamps: true });

module.exports = mongoose.model("Order", orderSchema);