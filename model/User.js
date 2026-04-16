const mongoose = require("mongoose");
const bcrypt   = require("bcryptjs");

const userSchema = new mongoose.Schema({
  name:     { type: String, required: [true, "Name required"], trim: true },
  email:    { type: String, required: [true, "Email required"], unique: true, lowercase: true, trim: true },
  password: { type: String, required: [true, "Password required"], minlength: 6 },
  role:     { type: String, enum: ["user", "admin"], default: "user" },
  avatar:   { type: String, default: "" },
  phone:    { type: String, default: "" },
  address: {
    street:  { type: String, default: "" },
    city:    { type: String, default: "" },
    state:   { type: String, default: "" },
    pincode: { type: String, default: "" },
    country: { type: String, default: "India" },
  },
  isActive: { type: Boolean, default: true },
  notifications: [{
    message:   { type: String },
    read:      { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
  }],
}, { timestamps: true });

// Hash before save
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  
});

userSchema.methods.matchPassword = async function (entered) {
  return bcrypt.compare(entered, this.password);
};

module.exports = mongoose.model("User", userSchema);