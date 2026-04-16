const { Cart } = require("../model/Cart");
const Product  = require("../model/Product");

const getCart = async (req, res, next) => {
  try {
    let cart = await Cart.findOne({ user: req.user._id }).populate("items.product", "name images price stock isActive");
    if (!cart) cart = { items: [] };
    res.json({ success: true, cart });
  } catch (err) { next(err); }
};

const addToCart = async (req, res, next) => {
  try {
    const { productId, quantity = 1 } = req.body;
    const product = await Product.findById(productId);
    if (!product || !product.isActive) return res.status(404).json({ success: false, message: "Product not found" });
    if (product.stock < quantity) return res.status(400).json({ success: false, message: "Insufficient stock" });

    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) cart = new Cart({ user: req.user._id, items: [] });

    const idx = cart.items.findIndex(i => i.product.toString() === productId);
    if (idx > -1) cart.items[idx].quantity = Math.min(cart.items[idx].quantity + Number(quantity), product.stock);
    else cart.items.push({ product: productId, quantity: Number(quantity) });

    await cart.save();
    await cart.populate("items.product", "name images price stock");
    res.json({ success: true, cart });
  } catch (err) { next(err); }
};

const updateCart = async (req, res, next) => {
  try {
    const { quantity } = req.body;
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) return res.status(404).json({ success: false, message: "Cart not found" });

    const idx = cart.items.findIndex(i => i.product.toString() === req.params.productId);
    if (idx === -1) return res.status(404).json({ success: false, message: "Item not in cart" });

    if (Number(quantity) <= 0) cart.items.splice(idx, 1);
    else cart.items[idx].quantity = Number(quantity);

    await cart.save();
    await cart.populate("items.product", "name images price stock");
    res.json({ success: true, cart });
  } catch (err) { next(err); }
};

const removeFromCart = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });
    cart.items = cart.items.filter(i => i.product.toString() !== req.params.productId);
    await cart.save();
    await cart.populate("items.product", "name images price stock");
    res.json({ success: true, cart });
  } catch (err) { next(err); }
};

const clearCart = async (req, res, next) => {
  try {
    await Cart.findOneAndUpdate({ user: req.user._id }, { items: [] });
    res.json({ success: true, message: "Cart cleared" });
  } catch (err) { next(err); }
};

module.exports = { getCart, addToCart, updateCart, removeFromCart, clearCart };