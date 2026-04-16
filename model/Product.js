const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema({
  user:    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  name:    String,
  rating:  { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true },
}, { timestamps: true });

const productSchema = new mongoose.Schema({
  name:          { type: String, required: [true, "Product name required"], trim: true },
  description:   { type: String, required: [true, "Description required"] },
  price:         { type: Number, required: [true, "Price required"], min: 0 },
  originalPrice: { type: Number, default: 0 },
  category:      { type: String, required: true, enum: ["Electronics","Clothing","Books","Home","Sports","Beauty","Toys","Food","Other"] },
  brand:         { type: String, default: "" },
  images:        [{ type: String }],
  stock:         { type: Number, required: true, default: 0, min: 0 },
  sold:          { type: Number, default: 0 },
  reviews:       [reviewSchema],
  rating:        { type: Number, default: 0 },
  numReviews:    { type: Number, default: 0 },
  featured:      { type: Boolean, default: false },
  isActive:      { type: Boolean, default: true },
  tags:          [{ type: String }],
}, { timestamps: true });

productSchema.methods.calcRating = function () {
  if (!this.reviews.length) { this.rating = 0; this.numReviews = 0; return; }
  this.rating    = +(this.reviews.reduce((s, r) => s + r.rating, 0) / this.reviews.length).toFixed(1);
  this.numReviews = this.reviews.length;
};

module.exports = mongoose.model("Product", productSchema);