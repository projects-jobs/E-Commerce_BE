const crypto = require("crypto");
const Razorpay = require("razorpay");
const Order = require("../model/Order");
const Product = require("../model/Product");
const Cart = require("../model/Cart");
const User = require("../model/User");
const { sendOrderConfirmation, sendPaymentSuccess, sendShippingUpdate } = require("../utility/Email");

const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ── STEP 1: Create Razorpay order ─────────────────────────────────────────
// @POST /api/orders/create-razorpay-order
const createRazorpayOrder = async (req, res, next) => {
  try {
    const { items, shippingAddress } = req.body;
    if (!items || !items.length)
      return res.status(400).json({ success: false, message: "No items" });

    // Validate stock and calculate price
    let itemsPrice = 0;
    const validatedItems = [];
    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product || product.stock < item.quantity)
        return res.status(400).json({ success: false, message: `Insufficient stock for ${product?.name}` });
      itemsPrice += product.price * item.quantity;
      validatedItems.push({ product: product._id, name: product.name, image: product.images[0] || "", price: product.price, quantity: item.quantity });
    }

    const shippingPrice = itemsPrice > 999 ? 0 : 50;
    const taxPrice      = Math.round(itemsPrice * 0.18);
    const totalPrice    = itemsPrice + shippingPrice + taxPrice;

    // Create Razorpay order (amount in paise)
    const rzpOrder = await razorpay.orders.create({
      amount:   totalPrice * 100,
      currency: "INR",
      receipt:  `order_${Date.now()}`,
    });

    res.json({
      success: true,
      razorpayOrderId: rzpOrder.id,
      amount:          totalPrice,
      key:             process.env.RAZORPAY_KEY_ID,
      orderData: { items: validatedItems, shippingAddress, itemsPrice, shippingPrice, taxPrice, totalPrice },
    });
  } catch (err) { next(err); }
};

// ── STEP 2: Verify payment + save order ───────────────────────────────────
// @POST /api/orders/verify-payment
const verifyPayment = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderData } = req.body;

    // ✅ Signature verification — NEVER trust frontend
    const body      = razorpay_order_id + "|" + razorpay_payment_id;
    const expected  = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET).update(body).digest("hex");
    if (expected !== razorpay_signature)
      return res.status(400).json({ success: false, message: "Payment verification failed" });

    // Save order in DB
    const order = await Order.create({
      user:            req.user._id,
      items:           orderData.items,
      shippingAddress: orderData.shippingAddress,
      paymentInfo:     { razorpay_order_id, razorpay_payment_id, razorpay_signature },
      itemsPrice:      orderData.itemsPrice,
      shippingPrice:   orderData.shippingPrice,
      taxPrice:        orderData.taxPrice,
      totalPrice:      orderData.totalPrice,
      isPaid:          true,
      paidAt:          new Date(),
      orderStatus:     "Processing",
      statusHistory:   [{ status: "Processing", note: "Payment received" }],
    });

    // Reduce stock
    for (const item of orderData.items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: -item.quantity, sold: item.quantity },
      });
    }

    // Clear cart
    await Cart.findOneAndUpdate({ user: req.user._id }, { items: [] });

    // Save notification on user
    await User.findByIdAndUpdate(req.user._id, {
      $push: { notifications: { message: `Order #${order._id} confirmed! Payment received ✅`, read: false } },
    });

    // Send emails (non-blocking)
    const user = await User.findById(req.user._id);
    sendOrderConfirmation(user, order).catch(console.error);
    sendPaymentSuccess(user, order).catch(console.error);

    // Socket.IO notification
    const io = req.app.get("io");
    if (io) io.to(`user_${req.user._id}`).emit("notification", { message: `Order #${order._id} confirmed! ✅` });

    res.json({ success: true, order });
  } catch (err) { next(err); }
};

// @GET /api/orders/my — user orders
const getMyOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 }).populate("items.product", "name images");
    res.json({ success: true, orders });
  } catch (err) { next(err); }
};

// @GET /api/orders/:id — single order
const getOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id).populate("user", "name email").populate("items.product");
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });
    // Allow only owner or admin
    if (order.user._id.toString() !== req.user._id.toString() && req.user.role !== "admin")
      return res.status(403).json({ success: false, message: "Forbidden" });
    res.json({ success: true, order });
  } catch (err) { next(err); }
};

// @GET /api/orders — admin: all orders
const adminGetOrders = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = status ? { orderStatus: status } : {};
    const total  = await Order.countDocuments(query);
    const orders = await Order.find(query).sort({ createdAt: -1 })
      .skip((page - 1) * limit).limit(Number(limit))
      .populate("user", "name email");
    res.json({ success: true, orders, total });
  } catch (err) { next(err); }
};

// @PUT /api/orders/:id/status — admin update status
const updateOrderStatus = async (req, res, next) => {
  try {
    const { status, note } = req.body;
    const order = await Order.findById(req.params.id).populate("user", "name email");
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    order.orderStatus = status;
    order.statusHistory.push({ status, note: note || "" });
    if (status === "Delivered") order.deliveredAt = new Date();
    await order.save();

    // Notify user
    await User.findByIdAndUpdate(order.user._id, {
      $push: { notifications: { message: `Your order #${order._id} is now ${status} ${status === "Shipped" ? "🚚" : status === "Delivered" ? "✅" : ""}`, read: false } },
    });

    // Email
    sendShippingUpdate(order.user, order, status).catch(console.error);

    // Socket
    const io = req.app.get("io");
    if (io) io.to(`user_${order.user._id}`).emit("notification", { message: `Order #${order._id} is ${status}!` });

    res.json({ success: true, order });
  } catch (err) { next(err); }
};

// @GET /api/orders/admin/stats — dashboard stats
const adminStats = async (req, res, next) => {
  try {
    const [totalOrders, totalRevenue, pendingOrders, deliveredOrders] = await Promise.all([
      Order.countDocuments(),
      Order.aggregate([{ $group: { _id: null, total: { $sum: "$totalPrice" } } }]),
      Order.countDocuments({ orderStatus: "Pending" }),
      Order.countDocuments({ orderStatus: "Delivered" }),
    ]);
    const User2 = require("../models/User");
    const Product2 = require("../models/Product");
    const [totalUsers, totalProducts] = await Promise.all([User2.countDocuments(), Product2.countDocuments({ isActive: true })]);

    res.json({
      success: true,
      stats: {
        totalOrders,
        totalRevenue: totalRevenue[0]?.total || 0,
        pendingOrders,
        deliveredOrders,
        totalUsers,
        totalProducts,
      },
    });
  } catch (err) { next(err); }
};

module.exports = { createRazorpayOrder, verifyPayment, getMyOrders, getOrder, adminGetOrders, updateOrderStatus, adminStats };